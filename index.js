var cssjson = require("cssjson");
var underscore = require("underscore");
var fs = require("fs");
var _ = require("underscore");
var isColor = require("is-color");
var colors = require("colors");
var format = require("cssbeautify");

var containsRgba = function(str) {
  if (!typeof str === String) return false;
  return str.indexOf("rgba") > -1;
};

var outputCSS = function(selectors) {
  var themeString = cssjson.toCSS(selectors);

  fs.writeFile("output/theme1.css", themeString, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("Theme was saved");
  });
};


var attributeIsAColor = function(attribute) {
  if (!_.isString(attribute)) return false;
  var matches = isColor(attribute) || containsRgba(attribute);
  return matches;
};

var getChildRules = function(attr) {
  return _.filter(attr.value, function(val) {
    return val.type === "rule";
  });
};

var getColorValues = function(values) {
  var colorValues = [];
  _.each(values, function(val) {
    if (attributeIsAColor(val.value)) {
      colorValues.push(val);
    }
  });
  return colorValues;
};

var indexify = function(rules) {
  var collection = {};
  _.each(rules, function(rule, index) {
    collection[index] = rule;
  });
  return collection;
};


var filteredByColor = function(rules) {
  var filteredRules = _.filter(rules, function(rule) {
    var ruleColorValues = getColorValues(rule.value);
    if (!_.isEmpty(ruleColorValues)) {
      rule.value = ruleColorValues;
      return rule;
    }
  });
  return filteredRules;
};

var parseRules = function(rules) {
  var rulesWithColors = [];
  _.each(rules, function(rule) {
    if (!rule.name || !rule.value) return;

    var childRules = getChildRules(rule);

    // If the rule has child rules e.g. media queries
    if (!_.isEmpty(childRules)) {
      var childRulesWithColors = filteredByColor(childRules);

      if (!_.isEmpty(childRulesWithColors)) {
        rulesWithColors.push({
          name: rule.name,
          value: childRulesWithColors
        });
      }

    } else {
      rule.value = _.filter(rule.value, function(value) {
        return attributeIsAColor(value.value);
      });

      if (!_.isEmpty(rule.value)) {
        rulesWithColors.push(rule);
      }
    }
  });

  return indexify(rulesWithColors)
};



fs.readFile("style.css", "utf-8", function(err, contents) {
  // Beautify css first
  var formattedCSS = format(contents, {
    indent: "  ",
    openbrace: "separate-line",
    autosemicolon: true
  });

  // combine media queries first

  var extractedCSS = cssjson.toJSON(formattedCSS, {
    ordered: true,
    stripComments: true
  });


  var parsedCSS = parseRules(extractedCSS);
  console.log(parsedCSS);

});