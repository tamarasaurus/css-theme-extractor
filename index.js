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

var outputCSS = function(cssString) {
  // var themeString = convertToCSS(selectors);
  fs.writeFile("output/theme1.css", cssString, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("Theme was saved at output/theme1.css");
  });
};

var makeAttributeString = function(name, value) {
  return "\t" + name + ": " + value + ";\n";
};

var makeBlockString = function(rule) {
  var blockString = "";
  blockString += "\t" + rule.name + " {\n";
  // if value is an array
  _.each(rule.value, function(val) {
    blockString += makeAttributeString(val.name, val.value);
  });

  blockString += "\t" + "}\n";
  return blockString;
};

var convertToCSS = function(rules) {
  // console.log(node);
  var cssString = "";
  _.each(rules, function(rule) {
    if (rule.hasChildren) {
      cssString += "\t" + rule.name + " {\n";
      _.each(rule.value, function(childRule) {
        cssString += makeBlockString(childRule);
      });
      cssString += "\t" + "}\n";
    } else {
      cssString += makeBlockString(rule);
    }
  });
  return cssString;
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

var parseAttributes = function(attributes) {
  var parsedAttributes = {};
  // if attribute type is rule
  _.each(attributes, function(attr) {
    if (attr.type === "attr") {
      parsedAttributes[attr.name] = attr.value;
    }
  });
  return parsedAttributes;
};

var parseChildren = function(children) {
  var parsedChildren = {};

  if (_.isObject(children)) {

    _.each(children, function(child) {
      if (child.type === "rule") {
        var parsedChild = {
          attributes: {}
        };
        parsedChild.attributes = parseAttributes(child.value);
        parsedChildren[child.name] = parsedChild;
      }
    });
  }
  return parsedChildren;
};

// Maybe drop this because the rules need to be in the same order
var indexify = function(rules) {
  var collection = {
    children: {}
  };
  _.each(rules, function(rule, index) {
    var existingRule = collection.children[rule.name];
    var parsedAttributes = parseAttributes(rule.value);
    var parsedChildren = parseChildren(rule.value);

    if (!existingRule) {
      collection.children[rule.name] = {
        attributes: parsedAttributes,
        children: parsedChildren
      };
    } else {
      existingRule.attributes = _.extend(existingRule.attributes, parsedAttributes);
      existingRule.children = _.extend(existingRule.children, parsedChildren);
    }
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
          value: childRulesWithColors,
          type: "rule",
          hasChildren: true
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

  return rulesWithColors;
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
  var convertedCSS = convertToCSS(parsedCSS);
  outputCSS(convertedCSS);
});