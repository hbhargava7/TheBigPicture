raw_text = "[6/13/15, 9:18:01 PM] Ruby Malusa: indeed\n[6/13/15, 9:18:02 PM] Lily Friedberg: Or fire island still.\n[6/13/15, 9:18:06 PM] Ruby Malusa: nah, i'm home\n[6/20/15, 4:35:33 PM] Lily Friedberg: Io back in more or less civilised land.\n[6/20/15, 6:33:59 PM] Hersh Bhargava: Welcome.";

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
    arrayOfLines = this.MessageText.match(/[^\r\n]+/g);
    var line = ""; var msgs = [];
    for (var i = 0; i < arrayOfLines.length; i++) {
        line = arrayOfLines[i];
        day = line.substring(line.indexOf('[')+1, line.indexOf(','));
        date = new Date(day);
        time = line.substring(line.indexOf(',')+2, line.indexOf(']')-3);
        time = time.split(":");
        date.setHours(time[0],time[1],time[2]);
        name = line.substring(line.indexOf(']')+2, line.indexOf(':', line.indexOf(']')));
        message = line.substring(line.indexOf(':', line.indexOf(']'))+2, line.length);
        this.ReceivedMessageList.push(new ReceivedMessage(name, date.getTime(), message));
    }
};

var ReceivedMessage = function(UserName, Timestamp, Message) {
    this.UserName = UserName;
    this.Timestamp = Timestamp;
    this.Message = Message;
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

ReceivedMessage.prototype.ToString = function() {
    return this.UserName + ' [' + this.Timestamp + ']: ' + this.Message;
};

var DecoratedMessage = function(ReceivedMessage) {
    this.UserName = ReceivedMessage.GetUserName();
    this.MessageDate = new Date(ReceivedMessage.GetTimestamp());
    this.Message = ReceivedMessage.GetMessage();
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
    while( (matchArray = regexToken.exec( source )) !== null )
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
    this.MostTalkativeUserListPerClusterList = [];
};

Conversation.prototype.GetReceivedMessageList = function() {
    return this.ReceivedMessageList;
};

Conversation.prototype.PreprocessMessageList = function() {
    this.OrderedMessageList = this.ReceivedMessageList;
    this.OrderedMessageList.sort(function(a, b) {
      return a.GetTimestamp() > b.GetTimestamp();
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
        margin = 15 * 60 * 1000;  // 15 minutes in milliseconds   
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

var parser = new SkypeMessageParser(raw_text);
parser.ParseMessageText();
var pc = new Conversation(parser.GetReceivedMessageList());
pc.PreprocessMessageList();
pc.FindTimestampClusters();
t = pc.GetPeakMessagingTimestampList();
u = pc.FindMostTalkativeUserList();
uu = pc.FindMostTalkativeUserListPerClusterList();
for(var i = 0; i < pc.GetTimestampClusterList().length; i++) {
    var start = pc.GetTimestampClusterList()[i].GetStartIndex();
    var end = pc.GetTimestampClusterList()[i].GetEndIndex();
    for(var j = 0; j < uu[i].length; j++) {
        console.log(uu[i][j].GetUserName());
        console.log(uu[i][j].GetLinkList());
    }
    for(var j = start; j < end; j++) {
        console.log(pc.GetOrderedDecoratedMessageList()[j].ToString());
    }
    console.log('===============');
}
for(var i = 0; i < t.length; i++) {
    console.log(new Date(t[i]).toString());
}
for(var i = 0; i < u.length; i++) {
    console.log(u[i].GetUserName());
}