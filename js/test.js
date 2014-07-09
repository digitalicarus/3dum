var canvas = document.body.appendChild(document.createElement('canvas'))
,   ctx = canvas.getContext('2d')
,   reqFrame = window.requestAnimationFrame
,   viewDist = 1000
,   width = 320
,   height = 240
,   aspect = width/height
,   Teapot
,   lilTeapot
;

canvas.width = width;
canvas.height = height;
canvas.style.backgroundColor = 'black';

function jsonp(src) {
	var s = document.createElement('script');
	s.async = true;
	s.src = src;
	document.getElementsByTagName('head')[0].appendChild(s);
}

function gameloop () {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	lilTeapot.rotateY(1);
	lilTeapot.render();
	reqFrame(gameloop);
}

function loadObjData (data) {
	Teapot = Model.define(data.data.files['utahteapot.obj'].content);
	lilTeapot = new Teapot();
	lilTeapot.setViewDist(viewDist);
	lilTeapot.scale(130);
	lilTeapot.translateY(70);
	lilTeapot.translateZ(1600);
	lilTeapot.rotateX(180);
	gameloop();
}

jsonp('https://api.github.com/gists/6eb9b67a528003423619?callback=loadObjData');
