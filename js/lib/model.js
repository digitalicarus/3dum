var Model = (function () {
	var ret            = {}
	,   mixins         = {}
	,   trigTab        = {}
	,   tt             = trigTab // shorthand
	,   trigRes        = 0 // shift multiplier for trig table resolution
	,   Arr            = (!!Float32Array) ? Float32Array : Array
	,   cap            = function (str) { return str.charAt(0).toUpperCase() + str.slice(1); }
	,   c              = {} // just a buffer for stuff we don't want in the garbage
	,   i, j, k        // some iterators
	,   genTrigTables  // var here to exec and define below
	;

	// for tranformaciones
	c.tmpVec      = new Arr(4);
	c.tmpMat      = new Arr(16);
	c.projPnt     = new Arr(2);
	c.pntOffset   = 0;

	(genTrigTables = function () {
		var size      = 360 << trigRes
		,   angleIncr = (Math.PI * 2) / size
		,   funcs     = ['tan', 'sin', 'cos']
		;

		for (i in funcs) {
			trigTab[funcs[i]]              = new Arr(size);
			trigTab['arc' + cap(funcs[i])] = new Arr(size);
		}

		for(i = 0, j = 0; i <= size; i++, j += angleIncr) {
			for(k in funcs) {
				trigTab[funcs[k]][i] = Math[funcs[k]](j);
				trigTab['arc' + cap(funcs[k])][i] = 1 / trigTab[funcs[k]][i]; 
			}
		} 	
	})(); // run at least once - may want to run again later? ... hence the symbol 

	// Util functions
	function rotToTrigTabIdx (val) {
		val = val%360;
		return ((val < 0) ? 360 - val : val) << trigRes;
	}

	function rotFromTrigTabIdx (idx) {
		return idx >> trigRes;
	}

 	// mixins for instances of Models
	// TODO: we could augment just the choice pieces of transform matrix here
	// instead of in the transformation function
	['x', 'y', 'z'].forEach(function (v,i) {
		var idx = i;
		mixins['rotate' + cap(v)]    = function (deg) { 
			this.rot[idx] = rotToTrigTabIdx(rotFromTrigTabIdx(this.rot[idx]) + deg); 
		}
		mixins['setRot' + cap(v)]    = function (deg) { 
			this.rot[idx] = rotToTrigTabIdx(deg); 
		}
		mixins['translate' + cap(v)] = function (n)   { this.loc[idx] = n || this.loc[idx]; }
		mixins['scale' + cap(v)]     = function (n)   { this.scl[idx] = n || this.scl[idx]; }
	});

	mixins.rotate  = function (x,y,z) {
		x !== undefined && x !== null && this.rotateX(x);
		y !== undefined && y !== null && this.rotateY(y);
		z !== undefined && z !== null && this.rotateZ(z);
	}
	mixins.translate = function (x,y,z) {
		x !== undefined && x !== null && this.translateX(x);
		y !== undefined && y !== null && this.translateY(y);
		z !== undefined && z !== null && this.translateZ(z);
	}
	mixins.scale = function (scale) {
		this.scaleX(scale);
		this.scaleY(scale);
		this.scaleZ(scale);
	}
 	mixins.getLoc = function () {
		return this.loc;
	};
	mixins.getRot = function () {
		return this.rot;
	};
	mixins.setCanvas = function (canvas) {
		if (canvas) {
			this.canvas     = canvas;
			this.ctx        = canvas.getContext('2d');
			this.aspect     = canvas.width/canvas.height;
			this.halfWidth  = canvas.width/2;
			this.halfHeight = canvas.height/2;
		}
	};
	mixins.setViewDist = function (viewDist) {
		this.viewDist = viewDist;
	};

	mixins.transform = function () { 
		// make stuff below easier to read
		c.x  = this.loc[0];   c.y  = this.loc[1];   c.z  = this.loc[2];
		c.sx = this.scl[0];   c.sy = this.scl[1];   c.sz = this.scl[2];
		c.rx = this.rot[0];   c.ry = this.rot[1];   c.rz = this.rot[2];

		// scale, rotate, translate
		c.tmpMat[0] = c.sx*tt.cos[c.rz]*tt.cos[c.ry];
		c.tmpMat[1] = c.sy*(-tt.sin[c.rz]*tt.cos[c.rx] + tt.cos[c.rz]*tt.sin[c.ry]*tt.sin[c.rx]);
		c.tmpMat[2] = c.sz*(tt.sin[c.rz]*tt.sin[c.rx] + tt.cos[c.rz]*tt.sin[c.ry]*tt.cos[c.rx]);
		c.tmpMat[3] = c.x;

		c.tmpMat[4] = c.sx*tt.sin[c.rz]*tt.cos[c.ry];
		c.tmpMat[5] = c.sy*(tt.cos[c.rz]*tt.cos[c.rx] + tt.sin[c.rz]*tt.sin[c.ry]*tt.sin[c.rx]);
		c.tmpMat[6] = c.sz*(-tt.cos[c.rz]*tt.sin[c.rx] + tt.sin[c.rz]*tt.sin[c.ry]*tt.cos[c.rx]);
		c.tmpMat[7] = c.y;

		c.tmpMat[8] = -c.sx*tt.sin[c.ry];
		c.tmpMat[9] = c.sy*tt.cos[c.ry]*tt.sin[c.rx];
		c.tmpMat[10] = c.sz*tt.cos[c.ry]*tt.cos[c.rx];
		c.tmpMat[11] = c.z;

		for (i=0; i<this.vertices.length; i+=3) {
			// scale
			c.tmpVec[0] = this.vertices[i];
			c.tmpVec[1] = this.vertices[i+1];
			c.tmpVec[2] = this.vertices[i+2];
			c.tmpVec[3] = 1;

			// mat * vec
			this.worldVert[i] = c.tmpMat[0]*c.tmpVec[0] + c.tmpMat[1]*c.tmpVec[1] + 
				c.tmpMat[2]*c.tmpVec[2] + c.tmpMat[3]*c.tmpVec[3];
			this.worldVert[i+1] = c.tmpMat[4]*c.tmpVec[0] + c.tmpMat[5]*c.tmpVec[1] + 
				c.tmpMat[6]*c.tmpVec[2] + c.tmpMat[7]*c.tmpVec[3];
			this.worldVert[i+2] = c.tmpMat[8]*c.tmpVec[0] + c.tmpMat[9]*c.tmpVec[1] + 
				c.tmpMat[10]*c.tmpVec[2] + c.tmpMat[11]*c.tmpVec[3];
		};
	};

	// TODO: transform in actual transformation functions?
	mixins.render = function () {
		this.transform();

		this.ctx.save();
		this.ctx.strokeStyle = 'lime';

		for (i=0,j=0; i < this.vertRefs.length; i++,j--) {
			c.pntOffset = (this.vertRefs[i]-1)*3;

			// project the vertex
			c.projPnt[0] = (this.worldVert[c.pntOffset]*this.viewDist/this.worldVert[c.pntOffset+2]) + this.halfWidth; 
			c.projPnt[1] = (this.worldVert[c.pntOffset+1]*this.viewDist/this.worldVert[c.pntOffset+2])*this.aspect + this.halfHeight;

			if (j === 0) {
				if (i !== 0) {
					this.ctx.stroke();
					this.ctx.closePath();
				}

				// draw normal
				/*
				this.ctx.beginPath();
				this.ctx.stroke();
				this.closePath();
				*/

				this.ctx.beginPath();
				this.ctx.moveTo(c.projPnt[0], c.projPnt[1]);
				j = this.vertPerFace;
 
			} else {
				this.ctx.lineTo(c.projPnt[0], c.projPnt[1]);
			}
		}
		// close the last path
		this.ctx.stroke();
		this.ctx.closePath();

		this.ctx.restore();
	};

	// define a new model / constructor with texture, points, and faces as class members
	ret.define = function (obj) {
		var Model = function () {
			this.loc   = new Arr([0,0,0]);
			this.rot   = new Arr([0,0,0]);
			this.scl   = new Arr([1,1,1]);

			this.setCanvas(document.getElementsByTagName('canvas')[0]);

			// this instances transformed/world vertices
			this.worldVert = new Arr(this.vertices);
		};

		obj = obj || "";

		// Parse OBJ
		Model.prototype.vertices = new Arr(
			[].concat.apply([], (obj.match(/v .*/g) || []).map(function (v,i) {
				return v.replace(/v\s+/, '').split(/\s+/).map(function (v,i) {
					return parseFloat(v);
				});
			}))
		);

		Model.prototype.vertRefs = new Arr(
			[].concat.apply([], (obj.match(/f .*/g) || []).map(function (v,i) {
				return v.replace(/f\s+/, '').replace(/[\/]{1,2}[0-9]+/g, '').match(/[0-9]+/g).map(function (v) {
					return parseFloat(v);
				});
			}))
		);

		Model.prototype.vertPerFace = obj.match(/f .*/)[0].replace(/f\s+/, '').replace(/[\/]{1,2}[0-9]+/g, '').match(/[0-9]+/g).length;

		// Generate Normals
		Model.prototype.normals = new Arr((Model.prototype.vertRefs.length / Model.prototype.vertPerFace)*3);
		(function () {
			var tmpV1=[], tmpV2=[], normal=[], p = [] /*verts-pnts*/, pntOffset, mag
			,   vertices = Array.apply([], Model.prototype.vertices)
			;

			for (i=0,k=1; i<Model.prototype.vertRefs.length; i+=Model.prototype.vertPerFace,k++) {
				/* 
					given 3 vertices in consistent winding order, take the cross product
					proto.vertRefs, proto.vertices, proto.vertPerFace

					http://www.fullonsoftware.co.uk/snippets/content/Math_-_Calculating_Face_Normals.pdf 
					Normal.x = (v1.y * v2.z) - (v1.z * v2.y); 
					Normal.y = -((v2.z * v1.x) - (v2.x * v1.z)); 
					Normal.z = (v1.x * v2.y) - (v1.y * v2.x); 
				*/

				// get pnts - 3 vertices to make a normal
				for (j=0; j<3; j++) {
					pntOffset = (Model.prototype.vertRefs[i+j]-1)*Model.prototype.vertPerFace; // 3 pnts per vert, vertPerFace verts per face 
					p[j] = vertices.slice(pntOffset, pntOffset + 3);
				}

				// make a couple vectors
				tmpV1[0] = p[1][0] - p[0][0]; tmpV1[1] = p[1][1] - p[0][1]; tmpV1[2] = p[1][2] - p[0][2];
				tmpV2[0] = p[2][0] - p[0][0]; tmpV2[1] = p[2][1] - p[0][1]; tmpV2[2] = p[2][2] - p[0][2];

				// cross product
				normal[0] =   tmpV1[1]*tmpV2[2] - tmpV1[2]*tmpV2[1];
				normal[1] = -(tmpV2[2]*tmpV1[0] - tmpV2[0]*tmpV1[2]);
				normal[2] =   tmpV1[0]*tmpV2[1] - tmpV1[1]*tmpV2[0];

				// normalize
				mag = Math.sqrt(Math.pow(normal[0],2) + Math.pow(normal[1],2) + Math.pow(normal[2],2));
				for (j=0; j<3; j++) {
					normal[j] /= mag;

					// store in normal member
					Model.prototype.normals[j*k] = normal[j];
				}

			}
		})();

		// Add mixin refs to prototype
		for (i in mixins) {
			if (mixins.hasOwnProperty(i)) {
				Model.prototype[i] = mixins[i];
			}
		}

		return Model;
	};

	return ret;
})();
