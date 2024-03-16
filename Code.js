var promptDefaults = [
  {
    prompt:
      "Generate a clever joke that playfully combines wordplay, a surprising twist, and relatable humor.",
    tags: [],
    temperature: 0.2,
    userID: "5600438c-16e6-4b9b-988a-753f2a00a89c",
    userName: "",
    description: "",
    icon: "😂",
    forkFrom: "",
    promptRunCount: 0,
    created: "",
    title: "Joke Generator",
    outputParsingPattern: "",
    outputParsingReplacement: "",
    recommendedModels: [],
    injectionMode: "append",
  },
  {
    prompt:
      "Translate the text in <input></input> from English to Japanese. Your output should be put in <output></output>.\n\n<input>{{text}}</input>",
    tags: [],
    temperature: 0.2,
    userID: "5600438c-16e6-4b9b-988a-753f2a00a89c",
    userName: "",
    description: "",
    icon: "🇯🇵",
    forkFrom: "",
    promptRunCount: 0,
    created: "",
    title: "Translate English to Japanese",
    outputParsingPattern: ".*<output>(.*)</output>.*",
    outputParsingReplacement: "$1",
    recommendedModels: [],
    injectionMode: "replace",
  },
  {
    prompt: "Improve the flow of the following text.",
    tags: ["helloo", "bye"],
    temperature: 0.2,
    userID: "5600438c-16e6-4b9b-988a-753f2a00a89c",
    userName: "",
    description: "",
    icon: "✍️",
    forkFrom: "",
    promptRunCount: 0,
    created: "",
    title: "Improve Text Flow",
    outputParsingPattern: "",
    outputParsingReplacement: "",
    recommendedModels: ["palm-2", "claude-1"],
    injectionMode: "replace",
  },
];

// Global Colors
var greenText = "#4dce46";
var greenBackground = "#BBFCB7";

var redText = "#F63107";
var redBackground = "#FDAFA8";

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
    .addItem("Launch", "showSidebar")
    .addToUi();
}

function getUiudAndUserId() {
  return [Utilities.getUuid(), establishUIUD()];
}

function establishUIUD() {
  const userProperties = PropertiesService.getUserProperties();
  if (!userProperties.getProperty("uiud")) {
    userProperties.setProperty("uiud", Utilities.getUuid());
  }
  return userProperties.getProperty("uiud");
}

function initDefaults() {
  const userProperties = PropertiesService.getUserProperties();
  if (!userProperties.getProperty("initDefault")) {
    var index = 0;
    promptDefaults.forEach(function (prompt) {
      prompt["created"] = new Date().toISOString();
      var uiud = Utilities.getUuid();
      addPrompt(uiud, prompt);
      addPromptFavorite(uiud, prompt, index);
      index++;
    });
    userProperties.setProperty("initDefault", "initialized");
  }
}

function initPrefModel() {
  const userProperties = PropertiesService.getUserProperties();
  if (!userProperties.getProperty("prefModel")) {
    userProperties.setProperty("prefModel", "gpt3.5-free");
  }
}

function setPrefModel(pref) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty("prefModel", pref);
}

function getPrefModel() {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty("prefModel");
}

function deletePrefModel() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty("prefModel");
}

function deletePromptHistory() {
  PropertiesService.getUserProperties().deleteProperty("promptFavorites");
  PropertiesService.getUserProperties().deleteProperty("localPrompts");
  PropertiesService.getUserProperties().deleteProperty("initDefault");
}

function addPromptFavorite(uiud) {
  var favorites =
    PropertiesService.getUserProperties().getProperty("promptFavorites");
  if (!favorites) {
    favorites = ["", "", ""];
  } else {
    favorites = JSON.parse(favorites);
  }
  for (var i = 0; i < favorites.length; i++) {
    if (favorites[i] == "") {
      favorites[i] = uiud;
      PropertiesService.getUserProperties().setProperty(
        "promptFavorites",
        JSON.stringify(favorites),
      );
      return favorites;
    }
  }
  return [];
}

function removePromptFavorite(uiud) {
  var favorites =
    PropertiesService.getUserProperties().getProperty("promptFavorites");
  if (!favorites) {
    favorites = ["", "", ""];
  } else {
    favorites = JSON.parse(favorites);
  }
  for (var i = 0; i < favorites.length; i++) {
    if (favorites[i] == uiud) {
      favorites[i] = "";
      PropertiesService.getUserProperties().setProperty(
        "promptFavorites",
        JSON.stringify(favorites),
      );
      return favorites;
    }
  }
  return favorites;
}

function getPromptFavorites() {
  var favorites =
    PropertiesService.getUserProperties().getProperty("promptFavorites");
  if (!favorites) {
    favorites = ["", "", ""];
  } else {
    favorites = JSON.parse(favorites);
  }
  return favorites;
}

function getFavoritesForToolbar() {
  var favorites = getPromptFavorites();
  var localPrompts = getPrompts();
  return [favorites, localPrompts];
}

function addPrompt(uiud, prompt) {
  var localPrompts =
    PropertiesService.getUserProperties().getProperty("localPrompts");
  if (!localPrompts) {
    localPrompts = {};
  } else {
    localPrompts = JSON.parse(localPrompts);
  }
  localPrompts[uiud] = prompt;
  PropertiesService.getUserProperties().setProperty(
    "localPrompts",
    JSON.stringify(localPrompts),
  );
}

function editPrompt(uiud, newInformation) {
  var allPrompts = getPrompts();
  var favorites = getPromptFavorites();
  if (uiud in allPrompts) {
    allPrompts[uiud] = newInformation;
  }
  PropertiesService.getUserProperties().setProperty(
    "localPrompts",
    JSON.stringify(allPrompts),
  );
  return favorites;
}

function addPromptRun(uiud) {
  var allPrompts = getPrompts();
  if (uiud in allPrompts) {
    allPrompts[uiud]["promptRunCount"] += 1;
  }
  PropertiesService.getUserProperties().setProperty(
    "localPrompts",
    JSON.stringify(allPrompts),
  );
}

function getPrompts() {
  var localPrompts =
    PropertiesService.getUserProperties().getProperty("localPrompts");
  if (!localPrompts) {
    localPrompts = {};
  } else {
    localPrompts = JSON.parse(localPrompts);
  }
  return localPrompts;
}

function removePrompt(uiud) {
  var localPrompts =
    PropertiesService.getUserProperties().getProperty("localPrompts");
  if (!localPrompts) {
    localPrompts = {};
  } else {
    localPrompts = JSON.parse(localPrompts);
  }
  if (uiud in localPrompts) {
    delete localPrompts[uiud];
  }
  PropertiesService.getUserProperties().setProperty(
    "localPrompts",
    JSON.stringify(localPrompts),
  );
  return removePromptFavorite(uiud);
}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  initDefaults();
  initPrefModel();
  var ui =
    HtmlService.createHtmlOutputFromFile("sidebar").setTitle("Wordflow");
  DocumentApp.getUi().showSidebar(ui);
}

function showPromptManager() {
  const promptManager = HtmlService.createHtmlOutputFromFile("promptmanager")
    .setWidth(800)
    .setHeight(500)
    .setTitle("Prompt Manager");
  DocumentApp.getUi().showModalDialog(promptManager, "Prompt Manager");
}

/**
 * Gets the user's OpenAI API key, if it exists.
 *
 * @return {Object} The user's API key, if
 *     it exists
 */
function getOpenAIAPIKey() {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty("openAIAPIKey");
}

/**
 * Sets the user's OpenAI API Key to the inputted string
 */
function setOpenAIAPIKey(inAPIKey) {
  if (inAPIKey) {
    PropertiesService.getUserProperties().setProperty("openAIAPIKey", inAPIKey);
  }
}

/**
 * Gets the user's Gemini Pro API Key, if it exists.
 *
 * @return {Object} The user's API key, if
 *     it exists
 */
function getGeminiAPIKey() {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty("geminiAPIKey");
}

/**
 * Sets the user's Geminin API Key to the inputted string
 */
function setGeminiAPIKey(inAPIKey) {
  if (inAPIKey) {
    PropertiesService.getUserProperties().setProperty("geminiAPIKey", inAPIKey);
  }
}

/**
 * Removes the user's stored API Keys
 */
function removeAPIKeys() {
  PropertiesService.getUserProperties().deleteProperty("openAIAPIKey");
  PropertiesService.getUserProperties().deleteProperty("geminiAPIKey");
}

/**
 * Utilizes the openAI API to construct response for prompt
 *
 * @param input The prompt
 * @param selectedText The text selected in the Google Document, if any
 * @param modeltype The model name to be used
 * @param temperature Temperature argument in openAI API request
 * @param usesel Whether the text selected in the document should be used as input in the openAI API request
 */
function completion(input, selectedText, modeltype, temperature, usesel) {
  var apiKey = getOpenAIAPIKey();
  var model = modeltype;
  if (usesel) {
    input += " "+selectedText;
  }
  var messages = [
    {
      role: "user",
      content: input,
    },
  ];
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

function geminiCompletion(input, selectedText, temperature, usesel) {
  var geminiApiKey = getGeminiAPIKey();
  var messages = [
    {
      role: "user",
      parts: [
        {
          text: input,
        },
      ],
    },
  ];
  if (usesel) {
    messages.push({
      role: "user",
      parts: [
        {
          text: selectedText,
        },
      ],
    });
  }

  var payload = {
    contents: messages,
    generationConfig: {
      temperature: temperature,
    },
  };

  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
    geminiApiKey;
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseData = JSON.parse(response.getContentText());
  return responseData.candidates[0].content?.parts[0].text;
}

function generateIdeas(
  title,
  emoji,
  prompt,
  temperature,
  parsingOutputPattern,
  parsingOutputReplacement,
  insertLocation,
  modelType,
) {
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();
  var formattedName = formatLLMName(modelType);
  if (selection) {
    var elements = selection.getRangeElements();
    var completeString = "";
    var startingPlacement = -1;
    var startingPlacementInd = -1;
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element.getElement().editAsText) {
        var [start, end, before, placement] = getStartAndEnd(element);
        startingPlacement =
          startingPlacement == -1 ? placement : startingPlacement;
        startingPlacementInd =
          startingPlacementInd == -1 ? start : startingPlacementInd;
        completeString += before.substring(start, end + 1);
      }
      if (insertLocation == "replace" && start != -1 && end != -1) {
        placement.deleteText(start, end);
      }
    }
    var generatedText = generateLLMCompletion(
      prompt,
      completeString,
      modelType,
      temperature,
      true,
    );
    if (parsingOutputPattern && parsingOutputReplacement) {
      let regex = new RegExp(parsingOutputPattern, "g");
      generatedText = generatedText.replace(regex, parsingOutputReplacement);
    }
    if (insertLocation == "replace") {
      var dmp = new diff_match_patch();
      var diff = dmp.diff_main(completeString, generatedText);
      insertTextIncludeDiff(startingPlacement, startingPlacementInd, diff);
    } else {
      insertAtEnd(doc, generatedText);
    }
    if (formattedName != "gpt-3.5-free") {
      submitPromptRun(prompt, completeString, temperature, formattedName);
    }
  } else {
    var generatedText = generateLLMCompletion(
      prompt,
      "",
      modelType,
      temperature,
      false,
    );
    if (parsingOutputPattern && parsingOutputReplacement) {
      let regex = new RegExp(parsingOutputPattern, "g");
      generatedText = generatedText.replace(regex, parsingOutputReplacement);
    }
    if (insertLocation == "replace") {
      var cursor = doc.getCursor();
      if (cursor) {
        var newText = cursor.insertText(generatedText);
        newText.setBackgroundColor(
          0,
          generatedText.length - 1,
          greenBackground,
        );
        newText.setForegroundColor(0, generatedText.length - 1, greenText);
        newText.setUnderline(0, generatedText.length - 1, true);
      } else {
        insertAtEnd(doc, generatedText);
      }
    } else {
      insertAtEnd(doc, generatedText);
    }
    if (formattedName != "gpt-3.5-free") {
      submitPromptRun(prompt, "", temperature, formattedName);
    }
  }
}

function generateLLMCompletion(
  input,
  selectedText,
  modeltype,
  temperature,
  usesel,
) {
  if (modeltype == "geminiPro") {
    return geminiCompletion(input, selectedText, temperature, usesel);
  } else if (modeltype == "gpt3.5-free") {
    return runPromptFree(input, selectedText, temperature);
  } else {
    return completion(input, selectedText, modeltype, temperature, usesel);
  }
}

function formatLLMName(llm) {
  if (llm == "gpt3.5-free") {
    return "gpt-3.5-free";
  } else if (llm == "gpt-3.5-turbo" || llm == "gpt-3.5-turbo-1106") {
    return "gpt-3.5";
  } else if (llm == "gpt-4") {
    return llm;
  } else if (llm == "geminiPro") {
    return "gemini-pro";
  }
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
function insertAtEnd(doc, generatedText) {
  var editor = doc.getBody().editAsText();
  var startOffset = editor.getText().length;
  var newText = editor.appendText(generatedText);
  newText.setBackgroundColor(
    startOffset,
    startOffset + generatedText.length - 1,
    greenBackground,
  );
  newText.setForegroundColor(
    startOffset,
    startOffset + generatedText.length - 1,
    greenText,
  );
  newText.setUnderline(
    startOffset,
    startOffset + generatedText.length - 1,
    true,
  );
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
      placement.setForegroundColor(start, start + length - 1, redText);
      placement.setBackgroundColor(start, start + length - 1, redBackground);
      placement.setStrikethrough(start, start + length - 1, true);
    } else if (t[0] == 0) {
      placement.insertText(start, t[1]);
    } else if (t[0] == 1) {
      placement.insertText(start, t[1]);
      placement.setBackgroundColor(start, start + length - 1, greenBackground);
      placement.setForegroundColor(start, start + length - 1, greenText);
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
        if (start <= start + replacement.length - 1) {
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
        if (start <= start + replacement.length - 1) {
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
}

function getMostRecent(tag = "") {
  var url =
    "https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?mostRecent=true&&tag=" +
    tag;

  var options = {
    async: true,
    method: "GET",
    headers: {
      origin: "https://poloclub.github.io",
    },
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response);
}

function getPopularTagsAndMostPopular() {
  return [getPopularTags(), getMostPopular()];
}

function getPopularTagsAndMostRecent() {
  return [getPopularTags(), getMostRecent()];
}

function getMostPopular(tag = "") {
  var url =
    "https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?mostPopular=true&&tag=" +
    tag;

  var options = {
    async: true,
    method: "GET",
    headers: {
      origin: "https://poloclub.github.io",
    },
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response);
}

function getPopularTags() {
  var url =
    "https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?popularTags=true";

  var options = {
    async: true,
    method: "GET",
    headers: {
      origin: "https://poloclub.github.io",
    },
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response);
}

function submitPromptRun(prompt, text, temperature, model) {
  var url =
    "https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?type=run";
  var payload = {
    prompt: prompt,
    text: text,
    temperature: temperature,
    userID: establishUIUD(),
    model: model,
  };
  var options = {
    async: true,
    method: "POST",
    headers: {
      origin: "https://poloclub.github.io",
      "Content-Type": "application/json",
      Cookie: "runRef=0617TvEL06VVjEO0NbaHBERmFVThqiJ",
    },
    credentials: "include",
    payload: JSON.stringify(payload),
  };
  UrlFetchApp.fetch(url, options);
}

function sharePrompt(
  prompt,
  tags,
  temperature,
  userName,
  description,
  icon,
  title,
  recommendedModels,
  injectionMode,
  outputParsingPattern,
  outputParsingReplacement,
) {
  tags = tags.split(",").map(function (tag) {
    return tag.trim();
  });

  var url =
    "https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?type=prompt";
  var payload = {
    prompt: prompt,
    tags: tags,
    temperature: temperature,
    userName: userName,
    description: description,
    icon: icon,
    forkFrom: "",
    title: title,
    userID: establishUIUD(),
    recommendedModels: recommendedModels,
    injectionMode: injectionMode,
    outputParsingPattern: outputParsingPattern,
    outputParsingReplacement: outputParsingReplacement,
  };
  var options = {
    async: true,
    method: "POST",
    headers: {
      origin: "https://poloclub.github.io",
      "Content-Type": "application/json",
      Cookie: "runRef=0617TvEL06VVjEO0NbaHBERmFVThqiJ",
    },
    credentials: "include",
    payload: JSON.stringify(payload),
  };
  UrlFetchApp.fetch(url, options);
}

function runPromptFree(input, selectedText, temperature) {
  var url =
    "https://62uqq9jku8.execute-api.us-east-1.amazonaws.com/prod/records?type=run";
  var payload = {
    prompt: input,
    text: selectedText,
    temperature: temperature,
    userID: establishUIUD(),
    model: "gpt-3.5-free",
  };
  var options = {
    async: true,
    method: "POST",
    headers: {
      origin: "https://poloclub.github.io",
      "Content-Type": "application/json",
      Cookie: "runRef=0617TvEL06VVjEO0NbaHBERmFVThqiJ",
    },
    credentials: "include",
    payload: JSON.stringify(payload),
  };
  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText()).payload?.result;
}

function removeAllAppData() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteAllProperties();
}
