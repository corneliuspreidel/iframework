/*global Parser:true*/
// extends src/nodes/image.js which extends src/node-box-native-view.js

$(function(){

  var template = '<div class="info"><span class="equation"></span> <span class="solution"></span></div>';

  Iframework.NativeNodes["util-math"] = Iframework.NativeNodes["util"].extend({

    template: _.template(template),
    info: {
      title: "math",
      description: "math equation evaluator"
    },
    initializeModule: function(){
      var self = this;
      if (window.Parser) {
        // Ready
        if (this._equation) {
          this.inputequation(this._equation);
        }
      } else {
        yepnope({
          load: "libs/js-expression-eval/parser.js",
          complete: function () {
            self.initializeModule();
          }
        });
      }
    },
    _expression: null,
    inputequation: function(s) {
      if (window.Parser) {
        try {
          this._expression = Parser.parse(s);
          // For some reason immediate evaluate() without values causes this to throw 
          var self = this;
          window.setTimeout(function(){
            self.inputevaluate();
          }, 500);

          this.$(".equation")
            .attr("title", this._expression.toString())
            .text(s + " = ");
        } catch (e) {
          this._expression = null;
          this.$(".equation").text("error parsing equation");
          this.$(".solution").text("");
        }
      } else {
        // Wait for library to load
        this._equation = s;
      }
    },
    inputevaluate: function() {
      if (this._expression) {
        try {
          var solution = this._expression.evaluate({
            x: this._x,
            y: this._y,
            z: this._z
          });
          if (solution===solution) {
            // not NaN
            this.send("equals", solution);
          }
          this.$(".solution").text(solution);
        } catch (e) {
          this.$(".solution").text("error evaluating; got variables?");
        }
      }
    },
    redraw: function(timestamp){
      // Called from NodeBoxNativeView.renderAnimationFrame()
      this.inputevaluate();
    },
    inputs: {
      x: {
        type: "float",
        "default": 0
      },
      y: {
        type: "float"
      },
      z: {
        type: "float"
      },
      equation: {
        type: "string",
        description: "f(x,y,z) (function calls), ^ (exponentiation), *, /, and % (multiplication, division, and remainder), and finally +, -, and || (addition, subtraction, and string concatenation) ... sin(x), cos(x), tan(x), asin(x), acos(x), atan(x), sqrt(x), log(x), abs(x), ceil(x), floor(x), round(x), exp(x) ... random(n), fac(n), min(a,b,…), max(a,b,…), pyt(a, b), pow(x, y), atan2(y, x)",
        "default": "x"
      },
      evaluate: {
        type: "bang",
        description: "evaluates the equation"
      }
    },
    outputs: {
      equals: {
        type: "float"
      }
    }

  });


});