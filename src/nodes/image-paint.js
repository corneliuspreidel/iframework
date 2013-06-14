// extends src/nodes/image.js which extends src/node-box-native-view.js

$(function(){

  var makeTools = function () {

    var tools = {
      painting: false,
      lastX: 0,
      lastY: 0,
      startX: 0, 
      startY: 0,
      minThickness: 1,
      maxThickness: 5,
      ctx: null, 
      mouseX: null, 
      mouseY: null,
      canvasPosition: {},
      stamp: null, 
      stampW: null, 
      stampH: null,
      drawStamp: function(e) {
        if (!tools.painting || !tools.stamp) { return; }
        tools.mouseX = e.pageX - tools.canvasPosition.left;
        tools.mouseY = e.pageY - tools.canvasPosition.top;
        tools.ctx.drawImage(tools.stamp, tools.mouseX-tools.stampW, tools.mouseY-tools.stampH);
        tools.lastX = tools.mouseX;
        tools.lastY = tools.mouseY;
      },
      drawSmoothPencil: function(e) {
        if (!tools.painting) { return; }
        tools.mouseX = e.pageX - tools.canvasPosition.left;
        tools.mouseY = e.pageY - tools.canvasPosition.top;
        tools.ctx.beginPath();
        tools.ctx.moveTo(tools.lastX, tools.lastY);
        tools.ctx.lineTo(tools.mouseX, tools.mouseY);
        tools.ctx.stroke();
        tools.lastX = tools.mouseX;
        tools.lastY = tools.mouseY;
      },
      drawPixelBrush: function(e) {
        // Thanks Loktar! http://stackoverflow.com/a/10130705/592125
        if (tools.painting) {
          tools.mouseX = e.pageX - tools.canvasPosition.left;
          tools.mouseY = e.pageY - tools.canvasPosition.top;
          // find all points between        
          var x1 = mouseX;
          var x2 = lastX;
          var y1 = mouseY;
          var y2 = lastY;
          var x, y;
          var steep = (Math.abs(y2 - y1) > Math.abs(x2 - x1));
          if (steep){
            x = x1;
            x1 = y1;
            y1 = x;

            y = y2;
            y2 = x2;
            x2 = y;
          }
          if (x1 > x2) {
            x = x1;
            x1 = x2;
            x2 = x;

            y = y1;
            y1 = y2;
            y2 = y;
          }
          var dx = x2 - x1;
          var dy = Math.abs(y2 - y1);
          var error = 0;
          var de = dy / dx;
          var yStep = -1;
          y = y1;
          if (y1 < y2) {
            yStep = 1;
          }
          lineThickness = tools.maxThickness - Math.sqrt((x2 - x1) *(x2-x1) + (y2 - y1) * (y2-y1))/10;
          if(lineThickness < tools.minThickness){
            lineThickness = tools.minThickness;
          }
          for (x = x1; x < x2; x++) {
            if (steep) {
              ctx.fillRect(y, x, lineThickness , lineThickness );
            } else {
              ctx.fillRect(x, y, lineThickness , lineThickness );
            }
            error += de;
            if (error >= 0.5) {
              y += yStep;
              error -= 1.0;
            }
          }
          tools.lastX = tools.mouseX;
          tools.lastY = tools.mouseY;
        }
      }
    };

    return tools;
  };


  Iframework.NativeNodes["image-paint"] = Iframework.NativeNodes["image"].extend({

    info: {
      title: "paint",
      description: "paint on, trace, or cut out an image"
    },
    events: {
      // "mousedown .draw": "startLine",
      // "mouseup .draw": "endLine"
    },
    initializeModule: function(){
      this.tools = makeTools();

      $(this.canvas).css("max-width", "none");

      this.trace = document.createElement("canvas");
      this.trace.width = this.canvas.width;
      this.trace.height = this.canvas.height;
      this.traceContext = this.trace.getContext("2d");
      $(this.canvas).before(this.trace);

      this.draw = document.createElement("canvas");
      this.draw.width = this.canvas.width;
      this.draw.height = this.canvas.height;
      this.drawContext = this.tools.ctx = this.draw.getContext("2d");
      this.drawContext.lineCap = "round";
      $(this.canvas).after(this.draw);
      $(this.draw).css({
        border: "1px solid #eee",
        borderWidth: "0 1px 1px 0"
      });

      this.$("canvas").css({position:"absolute", top:0, left:0});

      this.tools.canvasPosition = {};
      var scrollParent = this.model.view.$(".inner")[0];
      var scrollGraph = $(".graph")[0];
      var self = this;
      var setOffset = function(){
        self.tools.canvasPosition.left = self.model.get("x") - scrollParent.scrollLeft - scrollGraph.scrollLeft + 3;
        self.tools.canvasPosition.top = self.model.get("y") - scrollParent.scrollTop - scrollGraph.scrollTop + 3;
        console.log(self.tools.canvasPosition);
      };
      $(scrollParent).scroll(setOffset);
      $(scrollGraph).scroll(setOffset);
      this.model.on("change:x, change:y", setOffset);
      setOffset();

      this.draw.onmousedown = function(e){
        self.startLine(e);
      };
      $(window).mouseup(function(e){
        self.endLine(e);
      });

    },
    startLine: function(e) {
      this.tools.painting = true;
      this.tools.startX = this.tools.lastX = e.pageX - this.tools.canvasPosition.left;
      this.tools.startY = this.tools.lastY = e.pageY - this.tools.canvasPosition.top;
    },
    endLine: function(e){
      if (this.tools.painting) {
        this.tools.painting = false;
        // Copy to main canvas on every stroke
        this.context.drawImage(this.draw, 0, 0);
        this.drawContext.clearRect(0, 0, this._width, this._height);
        if (this._sendEvery) {
          this.inputsend();
        }
        // TODO undo stack
      }
    },
    inputstamp: function (image) {
      this.tools.stamp = image;
      this.tools.stampW = Math.floor(image.width/2);
      this.tools.stampH = Math.floor(image.height/2);
    },
    inputtool: function (tool) {
      this._tool = tool;
      switch (tool) {
        case "stamp" :
          this.draw.onmousemove = this.tools.drawStamp;
          break;
        case "smoothPencil" :
          this.draw.onmousemove = this.tools.drawSmoothPencil;
          break;
        case "pixelBrush" :
          this.tools.minThickness = 1;
          this.tools.maxThickness = this._strokewidth > 1 ? this._strokewidth : 2;
          this.drawContext.fillStyle = this._stroke;

          this.draw.onmousemove = this.tools.drawPixelBrush;
          break;
        default: // pixelPencil
          this.tools.minThickness = this._strokewidth;
          this.tools.maxThickness = this._strokewidth;
          this.drawContext.fillStyle = this._stroke;

          this.draw.onmousemove = this.tools.drawPixelBrush;
          break;
      }
    },
    inputimage: function (image) {
      this._image = image;
      this._triggerRedraw = true;
    },
    inputfill: function (color) {
      this._triggerRedraw = true;
      this._fill = color;
      this.drawContext.fillStyle = this._fill;
    },
    inputstroke: function (color) {
      this._triggerRedraw = true;
      this._stroke = color;
      this.drawContext.strokeStyle = this._stroke;
      this.inputtool(this._tool);
    },
    inputstrokewidth: function (w) {
      this._triggerRedraw = true;
      this._strokewidth = w;
      this.drawContext.lineWidth = this._strokewidth;
      this.inputtool(this._tool);
    },
    disconnectEdge: function(edge) {
      // Called from Edge.disconnect();
      if (edge.Target.id === "matte") {
        this._matte = null;
        this._triggerRedraw = true;
      }
    },
    canvasSettings: function () {
      if (this._fill === "") {
        this.drawContext.fillStyle = "none";
      } else {
        this.drawContext.fillStyle = this._fill;
      }
      if (this._stroke === "") {
        this.drawContext.strokeStyle = "none";
      } else {
        this.drawContext.strokeStyle = this._stroke;
      }
      this.drawContext.lineWidth = this._strokewidth;
      this.drawContext.lineCap = "round";
    },
    redraw: function(){
      // Called from NodeBoxNativeView.renderAnimationFrame()
      if (this.canvas.width !== this._width) {
        this.canvas.width = this._width;
        this.trace.width = this._width;
        this.draw.width = this._width;
        this.canvasSettings();
      }
      if (this.canvas.height !== this._height) {
        this.canvas.height = this._height;
        this.trace.height = this._height;
        this.draw.height = this._height;
        this.canvasSettings();
      }
      // this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // this.inputsend();
    },
    inputclear: function () {
      this.context.clearRect(0, 0, this._width, this._height);
    },
    inputsend: function () {
      this.send("image", this.canvas);
    },
    inputs: {
      // image: {
      //   type: "image",
      //   description: "image paint on"
      // },
      width: {
        type: "int",
        description: "canvas width",
        "default": 500
      },
      height: {
        type: "int",
        description: "canvas height",
        "default": 500
      },
      stamp: {
        type: "image",
        description: "image to use as stamp"
      },
      fill: {
        type: "color",
        description: "fill color",
        "default": "red"
      },
      stroke: {
        type: "color",
        description: "stroke color",
        "default": "black"
      },
      strokewidth: {
        type: "float",
        description: "stroke width",
        "default": 2
      },
      tool: {
        type: "string",
        description: "pixelPencil, pixelBrush, smoothPencil, rect, fillRect, strokeRect, stamp",
        options: "pixelPencil pixelBrush smoothPencil rect fillRect strokeRect stamp".split(" "),
        "default": "smoothPencil"
      },
      // mode: {
      //   type: "string",
      //   description: "how to combine drawing and image: on (draw on the image), trace (don't use image), or cutout (draw the matte for the image)",
      //   options: "on trace cutout".split(" "),
      //   "default": "on"
      // },
      clear: {
        type: "bang",
        description: "clear the canvas"
      },
      sendEvery: {
        type: "boolean",
        description: "send each stroke as you make it",
        "default": false
      },
      send: {
        type: "bang",
        description: "send the combined canvas"
      }
    },
    outputs: {
      image: {
        type: "image"
      }
    }

  });


});
