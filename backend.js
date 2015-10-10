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
    this.OrderedMessages = [];
    this.OrderedDecoratedMessages = [];
    this.TimestampClusterList = [];
    this.PeakMessagingTimestampClusterList = [];
};

Conversation.prototype.GetReceivedMessageList = function() {
    return this.ReceivedMessageList;
};

Conversation.prototype.PreprocessMessages = function() {
    this.OrderedMessages = this.ReceivedMessageList;
    this.OrderedMessages.sort(function(a, b) {
      return a.GetTimestamp() > b.GetTimestamp();
    });
    for(var i = 0; i < this.OrderedMessages.length; i++) {
        this.OrderedDecoratedMessages.push(new DecoratedMessage(this.OrderedMessages[i]));
    }
    return this.OrderedDecoratedMessages;
};

Conversation.prototype.FindTimestampClusters = function(margin) {
    if (typeof(margin) === "undefined") {
        margin = 15 * 60 * 1000;  // 15 minutes in milliseconds   
    }
    var prev_index = 0;
    var current_time = this.OrderedMessages[0].GetTimestamp();
    var prev_time = this.OrderedMessages[0].GetTimestamp();
    for(var i = 1; i < this.OrderedMessages.length; i++) {
        if(Math.abs(this.OrderedMessages[i].GetTimestamp() - current_time) <= margin) {
        }
        else {
            this.TimestampClusterList.push(new TimestampCluster(prev_index, i, prev_time, this.OrderedMessages[i].GetTimestamp()));
            prev_index = i;
            prev_time = this.OrderedMessages[i].GetTimestamp();
        }
        current_time = this.OrderedMessages[i].GetTimestamp();
    }
    this.TimestampClusterList.push(new TimestampCluster(prev_index, this.OrderedMessages.length, prev_time, this.OrderedMessages[this.OrderedMessages.length - 1].GetTimestamp()));
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
        var message_array = this.OrderedMessages.slice(this.PeakMessagingTimestampClusterList[i].GetStartIndex(), this.PeakMessagingTimestampClusterList[i].GetEndIndex());
        var sum = 0;
        for(var j = 0; j < message_array.length; j++) {
            sum += message_array[j].GetTimestamp();
        }
        ret.push(sum / total_messages);
    }
    return ret;
};

Conversation.prototype.GetOrderedMessages = function() {
    return this.OrderedMessages;
};

Conversation.prototype.GetOrderedDecoratedMessages = function() {
    return this.OrderedDecoratedMessages;
};

Conversation.prototype.GetTimestampClusterList = function() {
    return this.TimestampClusterList;
};

var parser = new SkypeMessageParser(raw_text);
parser.ParseMessageText();
var pc = new Conversation(parser.GetReceivedMessageList());
pc.PreprocessMessages();
pc.FindTimestampClusters();
t = pc.GetPeakMessagingTimestampList();
for(var i = 0; i < pc.GetTimestampClusterList().length; i++) {
    var start = pc.GetTimestampClusterList()[i].GetStartIndex();
    var end = pc.GetTimestampClusterList()[i].GetEndIndex();
    for(var j = start; j < end; j++) {
        console.log(pc.GetOrderedDecoratedMessages()[j].ToString());
    }
    console.log('===============');
}
for(var i = 0; i < t.length; i++) {
    console.log(new Date(t[i]).toString());
}