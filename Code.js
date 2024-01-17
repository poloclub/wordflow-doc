/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createMenu("Wordflow")
    .addItem("API Key Settings", "showAPIKeySettings")
    .addItem("Launch", "showSidebar")
    .addToUi();
}

function establishUIUD() {
  const userProperties = PropertiesService.getUserProperties();
  if (!userProperties.getProperty("uiud")) {
    userProperties.setProperty("uiud", Utilities.getUuid());
  }
  return userProperties.getProperty("uiud");
}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('sidebar').setTitle("Wordflow");
  DocumentApp.getUi().showSidebar(ui);
}

/**
 * Opens a modal dialog in the document displaying the user's API Key settings.
 */
function showAPIKeySettings() {
  const settings =
    HtmlService.createHtmlOutputFromFile("apikeysettings").setTitle(
      "API Key Settings",
    );
  DocumentApp.getUi().showModalDialog(settings, "API Key Settings");
}

/**
 * Gets the stored user API key, if it exists.
 *
 * @return {Object} The user's API key, if
 *     it exists
 */
function getAPIKey() {
  const userProperties = PropertiesService.getUserProperties();
  return {
    openAIAPIKey: userProperties.getProperty("openAIAPIKey"),
  };
}

/**
 * Sets the user's API Key to the inputted string
 */
function setAPIKey(inAPIKey) {
  if (inAPIKey) {
    PropertiesService.getUserProperties().setProperty("openAIAPIKey", inAPIKey);
  }
}

/**
 * Removes the user's stored API Key
 */
function removeAPIKey() {
  PropertiesService.getUserProperties().deleteProperty("openAIAPIKey");
}

/**
 * Returns favorite prompts
 */
function getFavorites() {
  var favorites =
    PropertiesService.getUserProperties().getProperty("favorites");
  if (!favorites) {
    favorites = [];
  } else {
    favorites = JSON.parse(favorites);
  }
  return favorites;
}

/**
 * Clears favorite prompts
 */
function clearFavorites() {
  PropertiesService.getUserProperties().deleteProperty("favorites");
}

/**
 * Adds inputted prompt to favorite prompts
 *
 * @param prompt The new prompt to add to favorites
 */
function addFavorite(prompt) {
  if (prompt) {
    var favorites = getFavorites();
    favorites.unshift(prompt);
    PropertiesService.getUserProperties().setProperty(
      "favorites",
      JSON.stringify(favorites),
    );
  }
}

/**
 * Removes inputted prompt from favorites
 *
 * @param prompt The prompt to remove from favorites
 */
function removeFavorite(prompt) {
  if (prompt) {
    var favorites = getFavorites();
    const index = favorites.indexOf(prompt);
    if (index > -1) {
      favorites.splice(index, 1);
    }
    PropertiesService.getUserProperties().setProperty(
      "favorites",
      JSON.stringify(favorites),
    );
  }
}

/**
 * Utilizes the openAI API to construct response for prompt
 *
 * @param input The prompt
 * @param selectedText The text selected in the Google Document, if any
 * @param modeltype The model name to be used
 * @param temperature Temperature argument in openAI API request
 * @param maxresponse Maximum response tokens argument in openAI API request
 * @param prespen Presence penalty argument in openAI API request
 * @param freqpen Frequency penalty in openAI API request
 * @param topp Top-p argument in openAI API request
 * @param usesel Whether the text selected in the document should be used as input in the openAI API request
 * @param specializedPrompt Any specialized requests for the openAI API request
 */
function completion(
  input,
  selectedText,
  modeltype,
  temperature,
  usesel,
  specializedPrompt,
) {
  var apiKey = getAPIKey().openAIAPIKey;
  var model = modeltype;
  var messages = [
    {
      role: "system",
      content: input,
    },
  ];
  if (specializedPrompt) {
    messages.push({
      role: "system",
      content: specializedPrompt,
    });
  }
  if (usesel) {
    messages.push({
      role: "user",
      content: selectedText,
    });
  }
  var requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    payload: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
    }),
  };

  var response = UrlFetchApp.fetch(
    "https://api.openai.com/v1/chat/completions",
    requestOptions,
  );
  var responseText = response.getContentText();
  var jsonResponse = JSON.parse(responseText);

  var generatedText = jsonResponse["choices"][0]["message"]["content"];

  if (generatedText) {
    generatedText = generatedText.trim();
  }

  generatedText = generatedText || "";

  var plainText = Utilities.formatString("%s", generatedText);
  return plainText;
}

/**
 * Constructs response for prompt and inserts it into Google Document based on selected settings
 *
 * @param input The inputted prompt
 * @param temperature Temperature argument in openAI API request
 * @param maxresponse Maximum response tokens argument in openAI API request
 * @param prespen Presence penalty argument in openAI API request
 * @param freqpen Frequency penalty in openAI API request
 * @param topp Top-p argument in openAI API request
 * @param usesel Whether the text selected in the document should be used as input in the openAI API request
 * @param insertLocation Where in the Google Document the response should be inserted
 * @param specializedPrompt Any specialized requests for the openAI API request
 *
 */
function generateIdeas(
  input,
  model,
  temperature,
  usesel,
  insertLocation,
  insertPrompt,
  specializedPrompt,
) {
  var doc = DocumentApp.getActiveDocument();
  if (usesel) {
    var selection = doc.getSelection();
    if (selection) {
      var elements = selection.getRangeElements();
      var completeString = "";
      var startingPlacement = -1;
      var startingPlacementInd = -1;
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        if (element.getElement().editAsText) {
          var [start, end, before, placement] = getStartAndEnd(element);
          if (end == -1) {
            continue;
          }
          startingPlacement = startingPlacement == -1 ? placement : startingPlacement;
          startingPlacementInd = startingPlacementInd == -1? start : startingPlacementInd;
          completeString += before.substring(start, end + 1);
        }
        if (insertLocation == "cursor") {
          placement.deleteText(start, end);
        }
      }
      var generatedText = completion(
        input,
        completeString,
        model,
        temperature,
        usesel,
        specializedPrompt,
      );
      if (insertLocation == "cursor") {
        if (insertPrompt) {
          generatedText = input + " " + generatedText; 
        }
        var dmp = new diff_match_patch();
        var diff = dmp.diff_main(completeString, generatedText);
        insertTextIncludeDiff(startingPlacement, startingPlacementInd, diff);
      } else {
        insertAtEnd(doc, generatedText, insertPrompt, input);
      }
    }
  } else if (!usesel) {
    var generatedText = completion(
      input,
      "",
      model,
      temperature,
      usesel,
      specializedPrompt,
    );
    if (insertLocation == "cursor") {
      var cursor = doc.getCursor();
      if (cursor) {
        if (insertPrompt) {
          generatedText = input + " " + generatedText;
        }
        var newText = cursor.insertText(generatedText);
        newText.setBackgroundColor(0, generatedText.length - 1, "#BBFCB7");
        newText.setForegroundColor(0, generatedText.length - 1, "#6BDD64");
        newText.setUnderline(0, generatedText.length - 1, true);
      } else {
        var selection = doc.getSelection();
        if (selection) {
          var element = selection.getRangeElements()[0];
          var [start, end, before, placement] = getStartAndEnd(element);
          before = before.substring(start, end + 1);
          if (start <= end) {
            placement.deleteText(start, end);
          }
          if (insertPrompt) {
            generatedText = input + " " + generatedText;
          }
          var dmp = new diff_match_patch();
          var diff = dmp.diff_main(before, generatedText);
          insertTextIncludeDiff(placement, start, diff);
        }
      }
    } else {
      insertAtEnd(doc, generatedText, insertPrompt, input);
    }
  }
  submitPromptRun(input, "", temperature, "gpt-3.5");
}

/**
 * Gets the start and end indices of a selected text
 * @param element The element corresponding to selected text
 */
function getStartAndEnd(element) {
  var start = -1;
  var end = -1;
  if (element.isPartial()) {
    start = element.getStartOffset();
    end = element.getEndOffsetInclusive();
  }
  var placement = element.getElement().asText();
  var before = placement.getText();
  start = start == -1 ? 0 : start;
  end = end == -1 ? before.length - 1 : end;
  return [start, end, before, placement];
}

/**
 * Inserts text at the end of a Google Document
 *
 * @param doc The Google document variable
 * @param generatedText The Text to insert at the end of the document
 * @param insertPrompt Whether or not to insert to prompt as well
 * @param input Contains prompt
 */
function insertAtEnd(doc, generatedText, insertPrompt, input) {
  /*var editor = doc.getBody().editAsText();//.setBackgroundColor("#BBFCB7").setForegroundColor("#6BDD64").setUnderline();
  if (insertPrompt) {
    editor.appendText(input + " ");
  }
  editor.appendText(generatedText); */
  var editor = doc.getBody().editAsText();
  var startOffset = editor.getText().length;
  if (insertPrompt) {
    generatedText = input +" " + generatedText;
  }
  var newText = editor.appendText(generatedText);
  newText.setBackgroundColor(startOffset, startOffset + generatedText.length - 1, "#BBFCB7");
  newText.setForegroundColor(startOffset, startOffset + generatedText.length - 1, "#6BDD64");
  newText.setUnderline(startOffset, startOffset + generatedText.length - 1, true);
}

/**
 * Method to add differences text (between old version and new version of selected text)
 *
 * @param placement Variable used to insert text at a chosen location
 * @param start Starting location of where to insert text
 * @param diff The array containing differences between old version and new version of selected text
 */
function insertTextIncludeDiff(placement, start, diff) {
  for (var s = diff.length - 1; s >= 0; s--) {
    var t = diff[s];
    var length = t[1].length;
    if (t[0] == -1) {
      placement.insertText(start, t[1]);
      placement.setForegroundColor(start, start + length - 1, "#F63107");
      placement.setBackgroundColor(start, start + length - 1, "#FDAFA8");
      placement.setStrikethrough(start, start + length - 1, true);
    } else if (t[0] == 0) {
      placement.insertText(start, t[1]);
    } else if (t[0] == 1) {
      placement.insertText(start, t[1]);
      placement.setBackgroundColor(start, start + length - 1, "#BBFCB7");
      placement.setForegroundColor(start, start + length - 1, "#6BDD64");
      placement.setUnderline(start, start + length - 1, true);
    }
  }
}

/**
 * Accepted suggestions in document (add all areas that are not striked through)
 */
function acceptSuggested() {
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();
  if (selection) {
    var elements = selection.getRangeElements();
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element.getElement().editAsText) {
        var replacement = "";
        var placement = element.getElement().asText();
        var textAttrChange = placement.getTextAttributeIndices();
        var start = element.isPartial() ? element.getStartOffset() : 0;
        var textLength = element.isPartial()
          ? element.getEndOffsetInclusive()
          : placement.getText().length - 1;
        if (textLength == -1) {
          continue;
        }
        var fullString = placement.getText();
        var copyAttrChange = [start];
        for (var k = 0; k < textAttrChange.length; k++) {
          if (start <= textAttrChange[k] && textAttrChange[k] <= textLength) {
            copyAttrChange.push(textAttrChange[k]);
          }
        }
        textAttrChange = copyAttrChange;
        for (var j = 0; j < textAttrChange.length; j++) {
          var startOffset = textAttrChange[j];
          var endOffset =
            j + 1 < textAttrChange.length
              ? textAttrChange[j + 1] - 1
              : textLength;
          if (!placement.isStrikethrough(startOffset)) {
            replacement += fullString.substring(startOffset, endOffset + 1);
          }
        }
        placement.deleteText(start, textLength);
        placement.insertText(start, replacement);
        placement.setUnderline(start, start + replacement.length - 1, false);
        placement.setStrikethrough(
          start,
          start + replacement.length - 1,
          false,
        );
        placement.setBackgroundColor(
          start,
          start + replacement.length - 1,
          "#FFFFFF",
        );
        placement.setForegroundColor(
          start,
          start + replacement.length - 1,
          "#000000",
        );
      }
    }
  }
}

/**
 * Reject suggestions (remove all areas that are underlined)
 */
function rejectSuggested() {
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();
  if (selection) {
    var elements = selection.getRangeElements();
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element.getElement().editAsText) {
        var replacement = "";
        var placement = element.getElement().asText();
        var textAttrChange = placement.getTextAttributeIndices();
        var start = element.isPartial() ? element.getStartOffset() : 0;
        var textLength = element.isPartial()
          ? element.getEndOffsetInclusive()
          : placement.getText().length - 1;
        if (textLength == -1) {
          continue;
        }
        var fullString = placement.getText();
        var copyAttrChange = [start];
        for (var k = 0; k < textAttrChange.length; k++) {
          if (start <= textAttrChange[k] && textAttrChange[k] <= textLength) {
            copyAttrChange.push(textAttrChange[k]);
          }
        }
        textAttrChange = copyAttrChange;
        for (var j = 0; j < textAttrChange.length; j++) {
          var startOffset = textAttrChange[j];
          var endOffset =
            j + 1 < textAttrChange.length
              ? textAttrChange[j + 1] - 1
              : textLength;
          if (!placement.isUnderline(startOffset)) {
            replacement += fullString.substring(startOffset, endOffset + 1);
          }
        }
        placement.deleteText(start, textLength);
        placement.insertText(start, replacement);
        placement.setUnderline(start, start + replacement.length - 1, false);
        placement.setStrikethrough(
          start,
          start + replacement.length - 1,
          false,
        );
        placement.setBackgroundColor(
          start,
          start + replacement.length - 1,
          "#FFFFFF",
        );
        placement.setForegroundColor(
          start,
          start + replacement.length - 1,
          "#000000",
        );
      }
    }
  }
}

function getMostRecent(tag = ""){
  var url = 'https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?mostRecent=true&&tag='+tag;

  var options = {
     "async": true,
     "method" : "GET",
     "headers" : {
       "origin": "https://poloclub.github.io"
     }
   };

  var response = UrlFetchApp.fetch(url, options);
  console.log(response.toString());
  return JSON.parse(response);
}

function getMostPopular(tag = "") {
  var url = 'https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?mostPopular=true&&tag='+tag;

  var options = {
     "async": true,
     "method" : "GET",
     "headers" : {
       "origin": "https://poloclub.github.io"
     }
   };

  var response = UrlFetchApp.fetch(url, options);
  console.log(JSON.parse(response)[0]);
  return JSON.parse(response);
}

function getPopularTags() {
  var url = 'https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?popularTags=true';

  var options = {
     "async": true,
     "method" : "GET",
     "headers" : {
       "origin": "https://poloclub.github.io"
     }
   };

  var response = UrlFetchApp.fetch(url, options);
  console.log(response.getHeaders());
  return JSON.parse(response);
}

function submitPromptRun(prompt, text, temperature, model) {
  var url = 'https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?type=run';
  var payload = {
    prompt: prompt, 
    text: text, 
    temperature: temperature, 
    userID: establishUIUD(), 
    model: model
  }
  var options = {
     "async": true,
     "method" : "POST",
     "headers" : {
       "origin": "https://poloclub.github.io",
       "Content-Type": "application/json", 
       "Cookie": 'runRef=0617TvEL06VVjEO0NbaHBERmFVThqiJ'
      }, 
      "credentials": 'include',
      "payload": JSON.stringify(payload),
  };
  UrlFetchApp.fetch(url, options);
}



