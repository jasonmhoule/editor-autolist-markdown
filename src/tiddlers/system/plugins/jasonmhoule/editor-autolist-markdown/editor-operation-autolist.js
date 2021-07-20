/*\
created: 20200803160356743
type: application/javascript
title: $:/plugins/jasonmhoule/editor-autolist-markdown/editor-operation-autolist
tags: 
modified: 20210720010949689
module-type: texteditoroperation
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.indent_line = function(line, mode, operation) {
    var indentRegExp = /^((\s\s)*-\s)(.*)$/;
	var indentMatch = line.match(indentRegExp);
	if(indentMatch != null) {
		//check if the line has content
		var content = (indentMatch[3].trim().length != 0) ? indentMatch[3].trim() : "";
		if(mode === "indent") {				
			//indent a line
            var newLine = "  " + indentMatch[1] + content;
		} else if(mode === "unindent") {
			//unindent a line
			var newLine = indentMatch[1].substring(2,indentMatch[1].length) + content;
        }
    } else {
        var newLine = line
    }
    return newLine
}

exports["autolist-markdown"] = function(event,operation) {
    
    var vs = Object()
    vs.lineStart = $tw.utils.findPrecedingLineBreak(operation.text,operation.selStart);
    vs.lineEnd = $tw.utils.findFollowingLineBreak(operation.text,operation.selStart);
	vs.line = operation.text.substring(vs.lineStart,vs.lineEnd);	

    if(vs.lineStart == operation.selEnd) {
      vs.linesEnd = $tw.utils.findFollowingLineBreak(operation.text,operation.selEnd);
    } else {
      vs.linesEnd = $tw.utils.findFollowingLineBreak(operation.text,operation.selEnd - 1); // avoids grabbing next line if selection includes end-of-line newline
    }
	vs.lines = operation.text.substring(vs.lineStart,vs.linesEnd);	
    vs.linesContents = vs.lines.split("\n")
    vs.lineslengths = []
    vs.linesContents.forEach((element, index) => {
        vs.lineslengths[index] = element.length
    });

	vs.prevlineStart = $tw.utils.findPrecedingLineBreak(operation.text,vs.lineStart -1);
	vs.prevlineEnd = $tw.utils.findFollowingLineBreak(operation.text,vs.lineStart -1);
    vs.prevline = operation.text.substring(vs.prevlineStart,vs.prevlineEnd);
	vs.nextlineStart = $tw.utils.findPrecedingLineBreak(operation.text,vs.linesEnd + 1);
	vs.nextlineEnd = $tw.utils.findFollowingLineBreak(operation.text,vs.linesEnd + 1);
    vs.nextline = operation.text.substring(vs.nextlineStart,vs.nextlineEnd);
	
	var listPrefixRegex = /^((\s\s)*-\s).*/;
	var match = vs.line.match(listPrefixRegex);
	
	var mode = event.paramObject? event.paramObject.mode : undefined;

	//ensure we only handle lines starting with * or #
	if(match != null && match[1]) {
		// check if we are handling indent level
		if(mode === "indent" || mode === "unindent") {
            operation.cutStart = vs.lineStart;
            operation.cutEnd = vs.linesEnd;
            vs.updatedLinesContents = [];
            vs.linesContents.forEach((element, index) => {
                vs.updatedLinesContents[index] = exports.indent_line(element, mode, operation)
            });
            if(mode === "indent") {				
                vs.selAdd = 2
            } else if(mode === "unindent") {
                vs.selAdd = -2
            }
            operation.replacement = vs.updatedLinesContents.join("\n");
            vs.newLinesEnd = vs.lineStart + operation.replacement.length;
            vs.newSelStart = Math.max(operation.selStart + vs.selAdd, vs.lineStart);
            vs.newSelEnd = Math.max(vs.newLinesEnd - (vs.linesEnd - operation.selEnd), vs.lineStart);
            operation.newSelStart = vs.newSelStart;
            operation.newSelEnd = vs.newSelEnd;
            //var myObj4 = { obj : "vs", var : vs };
            //console.log(myObj4)
            //var myObj5 = { obj : "op", var : operation };
            //console.log(myObj5)
		} else if(mode == "newline") {
			//handle enter key, meaning new line
			var trimmed = match[0].replace(/\s*$/, '');
			var prefixRegEx = /^((\s\s)*-)$/;
			var trimmedMatch = trimmed.match(prefixRegEx);
			if(trimmedMatch != null) {
				// the line only contains * or # characters and optional whitespace
				//terminate the list
				operation.replacement = "\n";
				operation.cutStart = vs.lineStart;
				operation.cutEnd = operation.selStart;
				operation.newSelStart = vs.lineStart + 1;
				operation.newSelEnd = vs.lineStart + 1;
			} else {
				// continue indent level on next line
				var prefix = match[1];
				if(operation.selStart - vs.lineStart < prefix.length) {
					operation.selStart = vs.lineStart + prefix.length
				}
				if(operation.selEnd - vs.lineStart < prefix.length) {
					operation.selEnd = vs.lineStart + prefix.length
				}
				operation.replacement = "\n" + prefix;
				operation.cutStart = operation.selStart;
				operation.cutEnd = operation.selEnd; //operation.selStart;
				
				//check if there is trailing whitespace on the line we are on
				// var lineEnd = $tw.utils.findFollowingLineBreak(operation.text,operation.selStart);
				var trailingText = operation.text.substring(operation.selStart,vs.lineEnd);
				if(trailingText.trim().length == 0) {
					operation.cutEnd = vs.lineEnd;
				}
				
				operation.newSelStart = operation.selStart + prefix.length + 1;
				operation.newSelEnd = operation.newSelStart //operation.selEnd + prefix.length + 1;
			}
		} else if(mode == "pushgroupup" && vs.prevlineStart != vs.lineStart) {
			// grab the previous line and place it below the selection 
			operation.replacement = vs.lines + "\n" + vs.prevline;
			operation.cutStart = vs.prevlineStart;
			operation.cutEnd = vs.linesEnd;
			operation.newSelStart = vs.prevlineStart;
			operation.newSelEnd = vs.prevlineStart + vs.lines.length;
        } else if(mode == "pushgroupdown" && vs.nextlineEnd != vs.linesEnd) {
			// grab the next line and place it above the selection
			operation.replacement = vs.nextline + "\n" + vs.lines;
			operation.cutStart = vs.lineStart;
			operation.cutEnd = vs.nextlineEnd;
			operation.newSelStart = vs.lineStart + vs.nextline.length + 1;
			operation.newSelEnd = vs.lineStart + vs.nextline.length + 1 + vs.lines.length;
        }
	} else if(mode == "newline") {
		// we need to manually add a linebreak for lines not starting with list markup
		operation.replacement = "\n";
		operation.cutStart = operation.selStart;
		operation.cutEnd = operation.selEnd;
		operation.newSelStart = operation.selStart + 1;
		operation.newSelEnd = operation.selEnd + 1;
	}
};

})();