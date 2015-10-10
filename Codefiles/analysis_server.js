//Configure base framework requirements
var express = require('express');
var path = require('path');

var app = express();

const port = 8080;

//Configure BodyParser
var bodyParser = require('body-parser');

app.use(bodyParser.json({limit: '50mb'})); 
app.use(bodyParser.urlencoded({ extended: true,limit: '50mb' }));

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/', function(req, res) {
    var user_id = req.body.id;
    var email = req.body.email;
    var token = "placeholder"
    var format = req.body.contentFormat;
    var content = req.body.content;
    
    
    /*
        I have configured the JSON Format as follows:
        
        {
            "id" : string,
            "token" : string,
            "content" : string
        }
        
        Test format is 'x-www-form-urlencoded'
    */
    
    //Server logic goes here.

    var natural = require('natural');
    var nlp_compromise = require('nlp_compromise');

    var SkypeMessageParser = function(text) {
    this.MessageText = text;
    this.ReceivedMessageList = [];
};

SkypeMessageParser.prototype.GetMessageText = function() {
    return this.MessageText;
};

SkypeMessageParser.prototype.GetReceivedMessageList = function() {
    return this.ReceivedMessageList;
};

SkypeMessageParser.prototype.ParseMessageText = function() {
    var arrayOfLines = this.MessageText.match(/[^\r\n]+/g);
    var line = "";
    var msgs = [];
    for (var i = 0; i < arrayOfLines.length; i++) {
        line = arrayOfLines[i];
        var day = line.substring(line.indexOf('[')+1, line.indexOf(','));
        var date = new Date(day);
        var time = line.substring(line.indexOf(',')+2, line.indexOf(']')-3);
        var PM = ((line.substring(line.indexOf(',')+2, line.indexOf(']'))).indexOf("AM") === - 1);
        time = time.split(":");
        if (PM && parseInt(time[0]) !== 12){
            time[0] = String(parseInt(time[0]) + 12);
        }
        date.setHours(time[0],time[1],time[2]);
        name = line.substring(line.indexOf(']')+2, line.indexOf(':', line.indexOf(']')));
        var message = line.substring(line.indexOf(':', line.indexOf(']'))+2, line.length);
        if(time[0] !== 'NaN')
            this.ReceivedMessageList.push(new ReceivedMessage(name, date.getTime(), message));
    }
    return this.ReceivedMessageList;
};

var Word = function(word, freq) {
    this.Text = word;
    this.Frequency = freq;
}

Word.prototype.GetText = function() {
    return this.Text;
}

Word.prototype.GetFrequency = function() {
    return this.Frequency;
}

Word.prototype.IncrementFrequency = function() {
    this.Frequency += 1;
    return this.Frequency;
}

var ReceivedMessage = function(UserName, Timestamp, Message) {
    this.UserName = UserName;
    this.Timestamp = Timestamp;
    this.Message = Message;
    this.WordList = [];
    var words = [];
    var split_words = new natural.WordTokenizer().tokenize(this.Message);
    console.log(split_words);
    for(var i = 0; i < split_words.length; i++) {
        var ind = words.indexOf(split_words[i]);
        if(ind == -1) {
            this.WordList.push(new Word(split_words[i], 1));
            words.push(split_words[i]);
        }
        else {
            this.WordList[ind].IncrementFrequency(1);
        }
    }
    this.WordList.sort(function(a, b) {
        if(a.GetFrequency() < b.GetFrequency()) {
            return -1;
        }
        if(a.GetFrequency() > b.GetFrequency()) {
            return 1;
        }
        return 0;
    });
};

ReceivedMessage.prototype.GetUserName = function() {
    return this.UserName;
};

ReceivedMessage.prototype.GetTimestamp = function() {
    return this.Timestamp;
};

ReceivedMessage.prototype.GetMessage = function() {
    return this.Message;
};

ReceivedMessage.prototype.GetWordList = function() {
    return this.WordList;
}

ReceivedMessage.prototype.ToString = function() {
    return this.UserName + ' [' + this.Timestamp + ']: ' + this.Message;
};

var DecoratedMessage = function(ReceivedMessage) {
    this.RawReceivedMessage = ReceivedMessage;
    this.UserName = ReceivedMessage.GetUserName();
    this.MessageDate = new Date(ReceivedMessage.GetTimestamp());
    this.Message = ReceivedMessage.GetMessage();
    this.WordList = ReceivedMessage.GetWordList();
};

DecoratedMessage.prototype.GetUserName = function() {
    return this.UserName;
};

DecoratedMessage.prototype.GetMessageDate = function() {
    return this.MessageDate;
};

DecoratedMessage.prototype.GetMessage = function() {
    return this.Message;
};

DecoratedMessage.prototype.GetWordList = function() {
    return this.WordList;
}

DecoratedMessage.prototype.GetRawReceivedMessage = function() {
    return this.RawReceivedMessage;
}

DecoratedMessage.prototype.ToString = function() {
    return this.UserName + ' [' + this.MessageDate.toString() + ']:\n' + this.Message;
};

var LinkIsolator = function(message) {
    this.Message = message;
    this.LinkList = [];
};

LinkIsolator.prototype.GetMessage = function() {
    return this.Message;
};

LinkIsolator.prototype.GetLinkList = function() {
    return this.LinkList;
};

LinkIsolator.prototype.IsolateLinkList = function() {
    var url;
    var matchArray;
    var regexToken = /(((ftp|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;
    while( (matchArray = regexToken.exec(this.Message)) !== null )
    {
        var token = matchArray[0];
        this.LinkList.push(token);
    }
    return this.LinkList;
};

var User = function(user) {
    this.UserName = user;
    this.MessageSentList = [];
    this.LinkList = [];
    this.WordList = [];
    this.WordDistributionList = [];
};

User.prototype.GetUserName = function() {
    return this.UserName;
};

User.prototype.GetMessageSentList = function() {
    return this.MessageSentList;
};

User.prototype.AddMessage = function(message) {
    this.MessageSentList.push(message);
};

User.prototype.GetLinkList = function() {
    return this.LinkList;
};

User.prototype.AddLink = function(link) {
    this.LinkList.push(link);
};

User.prototype.GenerateWordDistributionList = function() {
    var temp = [];
    var cont = [];
    for(var i = 0; i < this.MessageSentList.length; i++) {
        for(var j = 0; j < this.MessageSentList[i].GetWordList().length; j++) {
            var ind = temp.indexOf(this.MessageSentList[i].GetWordList()[j].GetText());
            if(ind == -1) {
                cont.push(new Word(this.MessageSentList[i].GetWordList()[j].GetText(), 1));
                temp.push(this.MessageSentList[i].GetWordList()[j].GetText());
            }
            else {
                cont[ind].IncrementFrequency();
            }
        }
    }
    cont.sort(function(a, b) {
        if(a.GetFrequency() < b.GetFrequency()) {
            return -1;
        }
        if(a.GetFrequency() > b.GetFrequency()) {
            return 1;
        }
        return 0;
    });
    this.WordDistributionList = cont;
    return this.WordDistributionList;
}

var TimestampCluster = function(startIndex, endIndex, startTime, endTime) {
    this.StartIndex = startIndex;
    this.EndIndex = endIndex;
    this.StartTimestamp = startTime;
    this.EndTimestamp = endTime;
};

TimestampCluster.prototype.GetStartIndex = function() {
    return this.StartIndex;
};

TimestampCluster.prototype.GetEndIndex = function() {
    return this.EndIndex;
};

TimestampCluster.prototype.GetStartTimestamp = function() {
    return this.StartTimestamp;
};

TimestampCluster.prototype.GetEndTimestamp = function() {
    return this.EndTimestamp;
};

var Conversation = function(ReceivedMessageList) {
    this.ReceivedMessageList = ReceivedMessageList;
    this.OrderedMessageList = [];
    this.OrderedDecoratedMessageList = [];
    this.TimestampClusterList = [];
    this.PeakMessagingTimestampClusterList = [];
    this.UserList = [];
    this.MostTalkativeUserList = [];
    this.LeastTalkativeUserList = [];
    this.MostTalkativeUserListPerClusterList = [];
    this.LeastTalkativeUserListPerClusterList = [];
};

Conversation.prototype.GetReceivedMessageList = function() {
    return this.ReceivedMessageList;
};

Conversation.prototype.PreprocessMessageList = function() {
    this.OrderedMessageList = this.ReceivedMessageList;
    this.OrderedMessageList.sort(function(a, b) {
        if(a.GetTimestamp() < b.GetTimestamp()) {
            return -1
        }
        if(a.GetTimestamp() > b.GetTimestamp()) {
            return 1;
        }
        return 0;
    });
    var temp = [];
    for(var i = 0; i < this.OrderedMessageList.length; i++) {
        if(temp.indexOf(this.OrderedMessageList[i].GetUserName()) == -1) {
            temp.push(this.OrderedMessageList[i].GetUserName());
            this.UserList.push(new User(this.OrderedMessageList[i].GetUserName()));
            this.UserList[this.UserList.length - 1].AddMessage(this.OrderedMessageList[i]);
            var l = new LinkIsolator(this.OrderedMessageList[i].GetMessage()).IsolateLinkList();
            for(var a = 0; a < l.length; a++) {
                this.UserList[this.UserList.length - 1].AddLink(l[a]);
            }
        }
        else {
            var k = temp.indexOf(this.OrderedMessageList[i].GetUserName());
            this.UserList[k].AddMessage(this.OrderedMessageList[i]);
            var l = new LinkIsolator(this.OrderedMessageList[i].GetMessage()).IsolateLinkList();
            for(var a = 0; a < l.length; a++) {
                this.UserList[k].AddLink(l[a]);
            }
        }
        this.OrderedDecoratedMessageList.push(new DecoratedMessage(this.OrderedMessageList[i]));
    }
    return this.OrderedDecoratedMessageList;
};

Conversation.prototype.FindTimestampClusters = function(margin) {
    if (typeof(margin) === "undefined") {
        margin = 5 * 60 * 1000;  // 15 minutes in milliseconds   
    }
    var prev_index = 0;
    var current_time = this.OrderedMessageList[0].GetTimestamp();
    var prev_time = this.OrderedMessageList[0].GetTimestamp();
    for(var i = 1; i < this.OrderedMessageList.length; i++) {
        if(Math.abs(this.OrderedMessageList[i].GetTimestamp() - current_time) <= margin) {
        }
        else {
            this.TimestampClusterList.push(new TimestampCluster(prev_index, i, prev_time, this.OrderedMessageList[i].GetTimestamp()));
            prev_index = i;
            prev_time = this.OrderedMessageList[i].GetTimestamp();
        }
        current_time = this.OrderedMessageList[i].GetTimestamp();
    }
    this.TimestampClusterList.push(new TimestampCluster(prev_index, this.OrderedMessageList.length, prev_time, this.OrderedMessageList[this.OrderedMessageList.length - 1].GetTimestamp()));
    return this.TimestampClusterList;
};

Conversation.prototype.GetPeakMessagingTimestampClusterList = function() {
    var range = 0;
    for(var i = 0; i < this.TimestampClusterList.length; i++) {
        var start = this.TimestampClusterList[i].GetStartIndex();
        var end = this.TimestampClusterList[i].GetEndIndex();
        if(end - start >= range) { 
            if (end - start == range) {
                this.PeakMessagingTimestampClusterList.push(this.TimestampClusterList[i]);
            }
            else {
                this.PeakMessagingTimestampClusterList = [this.TimestampClusterList[i]];
                range = end - start;
            }
        }
    }
    return this.PeakMessagingTimestampClusterList;
};

Conversation.prototype.GetPeakMessagingTimestampList = function() {
    var ret = [];
    this.PeakMessagingTimestampClusterList = this.GetPeakMessagingTimestampClusterList();
    for(var i = 0; i < this.PeakMessagingTimestampClusterList.length; i++) {
        var total_messages = this.PeakMessagingTimestampClusterList[i].GetEndIndex() - this.PeakMessagingTimestampClusterList[i].GetStartIndex();
        var message_array = this.OrderedMessageList.slice(this.PeakMessagingTimestampClusterList[i].GetStartIndex(), this.PeakMessagingTimestampClusterList[i].GetEndIndex());
        var sum = 0;
        for(var j = 0; j < message_array.length; j++) {
            sum += message_array[j].GetTimestamp();
        }
        ret.push(sum / total_messages);
    }
    return ret;
};

Conversation.prototype.FindMostTalkativeUserList = function() {
    var max = 0;
    for(var i = 0; i < this.UserList.length; i++) {
        if(this.UserList[i].GetMessageSentList().length >= max) {
            if(this.UserList[i].GetMessageSentList().length == max) {
                this.MostTalkativeUserList.push(this.UserList[i]);
            }
            else {
                this.MostTalkativeUserList = [this.UserList[i]];
            }
            max = this.UserList[i].GetMessageSentList().length;
        }
    }
    return this.MostTalkativeUserList;
};

Conversation.prototype.FindLeastTalkativeUserList = function() {
    var min = 10000000;
    for(var i = 0; i < this.UserList.length; i++) {
        if(this.UserList[i].GetMessageSentList().length <= min) {
            if(this.UserList[i].GetMessageSentList().length == min) {
                this.LeastTalkativeUserList.push(this.UserList[i]);
            }
            else {
                this.LeastTalkativeUserList = [this.UserList[i]];
            }
            min = this.UserList[i].GetMessageSentList().length;
        }
    }
    return this.LeastTalkativeUserList;
};

Conversation.prototype.FindMostTalkativeUserListPerClusterList = function() {
    for(var i = 0; i < this.TimestampClusterList.length; i++) {
        var current = this.OrderedMessageList.slice(this.TimestampClusterList[i].GetStartIndex(), this.TimestampClusterList[i].GetEndIndex());
        var temp = [];
        var userList = [];
        for(var j = 0; j < current.length; j++) {
            if(temp.indexOf(current[j].GetUserName()) == -1) {
                temp.push(current[j].GetUserName());
                userList.push(new User(current[j].GetUserName()));
                userList[userList.length - 1].AddMessage(current[j]);
                var l = new LinkIsolator(current[j].GetMessage()).IsolateLinkList();
                for(var a = 0; a < l.length; a++) {
                    userList[userList.length - 1].AddLink(l[a]);
                }
            }
            else {
                var k = temp.indexOf(current[j].GetUserName());
                userList[k].AddMessage(current[j]);
                var l = new LinkIsolator(current[j].GetMessage()).IsolateLinkList();
                for(var a = 0; a < l.length; a++) {
                    userList[k].AddLink(l[a]);
                }
            }
        }
        var max = 0;
        var current_max = [];
        for(var m = 0; m < userList.length; m++) {
            if(userList[m].GetMessageSentList().length >= max) {
                if(userList[m].GetMessageSentList().length == max) {
                    current_max.push(userList[m]);
                }
                else {
                    current_max = [userList[m]];
                }
                max = userList[m].GetMessageSentList().length;
            }
        }
        this.MostTalkativeUserListPerClusterList.push(current_max);
    }
    return this.MostTalkativeUserListPerClusterList;
};

Conversation.prototype.FindLeastTalkativeUserListPerClusterList = function() {
    for(var i = 0; i < this.TimestampClusterList.length; i++) {
        var current = this.OrderedMessageList.slice(this.TimestampClusterList[i].GetStartIndex(), this.TimestampClusterList[i].GetEndIndex());
        var temp = [];
        var userList = [];
        for(var j = 0; j < current.length; j++) {
            if(temp.indexOf(current[j].GetUserName()) == -1) {
                temp.push(current[j].GetUserName());
                userList.push(new User(current[j].GetUserName()));
                userList[userList.length - 1].AddMessage(current[j]);
                var l = new LinkIsolator(current[j].GetMessage()).IsolateLinkList();
                for(var a = 0; a < l.length; a++) {
                    userList[userList.length - 1].AddLink(l[a]);
                }
            }
            else {
                var k = temp.indexOf(current[j].GetUserName());
                userList[k].AddMessage(current[j]);
                var l = new LinkIsolator(current[j].GetMessage()).IsolateLinkList();
                for(var a = 0; a < l.length; a++) {
                    userList[k].AddLink(l[a]);
                }
            }
        }
        var min = 10000000;
        var current_min = [];
        for(var m = 0; m < userList.length; m++) {
            if(userList[m].GetMessageSentList().length <= min) {
                if(userList[m].GetMessageSentList().length == min) {
                    current_min.push(userList[m]);
                }
                else {
                    current_min = [userList[m]];
                }
                max = userList[m].GetMessageSentList().length;
            }
        }
        this.LeastTalkativeUserListPerClusterList.push(current_min);
    }
    return this.LeastTalkativeUserListPerClusterList;
};

Conversation.prototype.GetOrderedMessageList = function() {
    return this.OrderedMessageList;
};

Conversation.prototype.GetOrderedDecoratedMessageList = function() {
    return this.OrderedDecoratedMessageList;
};

Conversation.prototype.GetTimestampClusterList = function() {
    return this.TimestampClusterList;
};

Conversation.prototype.GetUserList = function() {
    return this.UserList;
};

Conversation.prototype.TimeClusterChatFrequencyToHistogram = function() {
    var temp = [];
    for(var i = 0; i < this.GetTimestampClusterList().length; i++) {
        temp.push({'y': this.GetTimestampClusterList()[i].GetEndIndex() - this.GetTimestampClusterList()[i].GetStartIndex()});
    }
    return temp;
};
    
    var finalArray = [];
    var finalString = "";
    
    var parser = new SkypeMessageParser(content);
    parser.ParseMessageText();
    var pc = new Conversation(parser.GetReceivedMessageList());
    pc.PreprocessMessageList();
    pc.FindTimestampClusters();
    t = pc.GetPeakMessagingTimestampList();
    uu = pc.FindMostTalkativeUserListPerClusterList();
    uul = pc.FindLeastTalkativeUserListPerClusterList();
    hist = pc.TimeClusterChatFrequencyToHistogram();
    for(var i = 0; i < pc.GetTimestampClusterList().length; i++) {
        var start = pc.GetTimestampClusterList()[i].GetStartIndex();
        var end = pc.GetTimestampClusterList()[i].GetEndIndex();
        finalString += "Most Talkative Users: ";
        for(var j = 0; j < uu[i].length; j++) {
            finalString += (uu[i][j].GetUserName()) + "\n";
            for(var h = 0; h < uu[i][j].GetLinkList().length; h++) {
                finalString += uu[i][j].GetLinkList()[h] + "\n";
            }
            var word_dist = uu[i][j].GenerateWordDistributionList();
            for(var c = 0; c < word_dist.length; c++) {
                var to_print = word_dist[c].GetText() + ": ";
                for(var d = 0; d < word_dist[c].GetFrequency(); d++) {
                    to_print += "*";
                }
                finalString += to_print + "\n";
            }
            finalString += "--------------\n"
        }
        finalString += "Least Talkative Users: ";
        for(var j = 0; j < uul[i].length; j++) {
            finalString += (uul[i][j].GetUserName()) + "\n";
            for(var h = 0; h < uul[i][j].GetLinkList().length; h++) {
                finalString += uul[i][j].GetLinkList()[h] + "\n";
            }
            var word_dist = uu[i][j].GenerateWordDistributionList();
            for(var c = 0; c < word_dist.length; c++) {
                var to_print = word_dist[c].GetText() + ": ";
                for(var d = 0; d < word_dist[c].GetFrequency(); d++) {
                    to_print += "*";
                }
                finalString += to_print + "\n";
            }
            finalString += "--------------\n"
        }
        finalString += "Start Time: " + new Date(pc.GetTimestampClusterList()[i].GetStartTimestamp()).toString() + "\n";
        for(var j = start; j < end; j++) {
            finalArray.push((pc.GetOrderedDecoratedMessageList()[j].ToString()));
            finalString += ('*');
        }
        finalString += "\n"

        finalArray.push(('==============='));
        finalString += ('===============');
        finalString += "\n";
    }
    res.writeHead(200, {
        'Content-Type': 'text/html',

    });
    //    res.send("Server received data successfully: " +user_id + ' ' + token + ' ' + content);
    res.end("<html><head><style type=\"text/css\">html{white-space: pre-wrap;}</style></head><body>"+finalString+"</body></html>");
});

//Incept server
app.listen(port);

//Confirm run
console.log("Analysis Server running at http://localhost:%s", port);
 