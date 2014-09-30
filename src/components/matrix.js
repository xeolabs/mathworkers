
/**
 *  Matrix class
 */
MW.Matrix = function(nrows, ncols, mathWorkerId, nWorkersInput) {
	var that = this;
	var id = mathWorkerId || 0;
	var nWorkers = nWorkersInput || 1;
	this.nrows = nrows || 0;
	this.ncols = ncols || 0;

	var A = [];
	if (nrows > 0 && ncols > 0) {
		for (var r = 0; r < nrows; ++r) {
			A.push(new Float64Array(ncols));
		}
	}

	this.get = function(i, j) {
		return A[i][j];
	}

	this.set = function(i, j, val) {
		A[i][j] = val;
	}

	this.getRow = function(i) {
		return A[i];
	}

	this.getArray = function() {
		return A;
	}

	// B is array of Float64Arrays, like A is in the class Matrix
	this.setMatrix = function(B) {
		A = B;
		that.nrows = B.length;
		that.ncols = B[0].length;
	}

	this.toString = function() {
		var str = "";
		for (var i = 0; i < that.nrows; ++i) {
			var row = "[";
			for (var j = 0; j < that.ncols - 1; ++j) {
				row += A[i][j] + ", ";
			}
			str += row + A[i][that.ncols-1] + "]";
			if (i != that.nrows - 1) {
				str += "\n";
			}
		}
		return str;
	}

	this.sendToCoordinator = function(tag) {
		// only id 0 does the sending actually
		if (id == 0) {
			var matObject = {handle: "matrixSendToCoordinator", tag: tag, nrows: that.nrows};
			var matBufferList = [];
			for (var i = 0; i < that.nrows; ++i) {
				matObject[i] = A[i].buffer;
				matBufferList.push(A[i].buffer);
			}

			self.postMessage(matObject, matBufferList);
		}
	}

	this.plus = function(B) {
		var C = new MW.Matrix(that.nrows, that.ncols);
		for (var i = 0; i < that.nrows; ++i) {
			for (var j = 0; j < that.ncols; ++j) {
				C.set(i, j, A[i][j] + B.get(i, j));
			}
		}
		return C;		
	}

	this.minus = function(B) {
		var C = new MW.Matrix(that.nrows, that.ncols);
		for (var i = 0; i < that.nrows; ++i) {
			for (var j = 0; j < that.ncols; ++j) {
				C.set(i, j, A[i][j] - B.get(i, j));
			}
		}
		return C;		
	}

	this.times = function(B) {
		var C = new MW.Matrix(that.nrows, that.ncols);
		for (var i = 0; i < that.nrows; ++i) {
			for (var j = 0; j < that.ncols; ++j) {
				C.set(i, j, A[i][j] * B.get(i, j));
			}
		}
		return C;		
	}

	this.dividedBy = function(B) {
		var C = new MW.Matrix(that.nrows, that.ncols);
		for (var i = 0; i < that.nrows; ++i) {
			for (var j = 0; j < that.ncols; ++j) {
				C.set(i, j, A[i][j] / B.get(i, j));
			}
		}
		return C;		
	}

	this.scale = function(alpha) {
		var C = new MW.Matrix(that.nrows, that.ncols);
		for (var i = 0; i < that.nrows; ++i) {
			for (var j = 0; j < that.ncols; ++j) {
				C.set(i, j, alpha * A[i][j]);
			}
		}
		return C;		
	}

	this.apply = function(fn) {
		var C = new MW.Matrix(that.nrows, that.ncols);
		for (var i = 0; i < that.nrows; ++i) {
			for (var j = 0; j < that.ncols; ++j) {
				C.set(i, j, fn(A[i][j]));
			}
		}
		return C;		
	}

	// matrix-vector multiply: A.v
	this.timesVector = function(v) {
		var w = new MW.Vector(that.nrows);
		for (var i = 0; i < that.nrows; ++i) {
			var tot = 0.0;
			for (var j = 0; j < that.ncols; ++j) {
				tot += A[i][j] * v.get(j);
			}
			w.set(i, tot);
		}
		return w;
	}

	var gatherMatrix = function(mat, offset, tag) {
		var matObject = {handle: "gatherMatrix", tag: tag, id: id, nrows: mat.length, offset: offset};
		var matBufferList = [];
		for (var i = 0; i < mat.length; ++i) {
			matObject[i] = mat[i].buffer;
			matBufferList.push(mat[i].buffer);
		}
		self.postMessage(matObject, matBufferList);
	}

	this.wkPlus = function(B, tag) {
		var lb = util.loadBalance(that.nrows, nWorkers, id);
		var C = [];
		var offset = 0;
		for (var i = lb.ifrom; i < lb.ito; ++i) {
			C.push(new Float64Array(that.ncols));
			for (var j = 0; j < that.ncols; ++j) {
				C[offset][j] = A[i][j] + B.get(i, j);
			}
			++offset;
		}
		gatherMatrix(C, offset-1, tag);
	}

	this.wkMinus = function(B, tag) {
		var lb = util.loadBalance(that.nrows, nWorkers, id);
		var C = [];
		var offset = 0;
		for (var i = lb.ifrom; i < lb.ito; ++i) {
			C.push(new Float64Array(that.ncols));
			for (var j = 0; j < that.ncols; ++j) {
				C[offset][j] = A[i][j] - B.get(i, j);
			}
			++offset;
		}
		gatherMatrix(C, offset-1, tag);
	}

	this.wkTimes = function(B, tag) {
		var lb = util.loadBalance(that.nrows, nWorkers, id);
		var C = [];
		var offset = 0;
		for (var i = lb.ifrom; i < lb.ito; ++i) {
			C.push(new Float64Array(that.ncols));
			for (var j = 0; j < that.ncols; ++j) {
				C[offset][j] = A[i][j] * B.get(i, j);
			}
			++offset;
		}
		gatherMatrix(C, offset-1, tag);
	}

	this.wkDividedBy = function(B, tag) {
		var lb = util.loadBalance(that.nrows, nWorkers, id);
		var C = [];
		var offset = 0;
		for (var i = lb.ifrom; i < lb.ito; ++i) {
			C.push(new Float64Array(that.ncols));
			for (var j = 0; j < that.ncols; ++j) {
				C[offset][j] = A[i][j] / B.get(i, j);
			}
			++offset;
		}
		gatherMatrix(C, offset-1, tag);
	}

	this.wkScale = function(alpha, tag) {
		var lb = util.loadBalance(that.nrows, nWorkers, id);
		var C = [];
		var offset = 0;
		for (var i = lb.ifrom; i < lb.ito; ++i) {
			C.push(new Float64Array(that.ncols));
			for (var j = 0; j < that.ncols; ++j) {
				C[offset][j] = alpha * A[i][j];
			}
			++offset;
		}
		gatherMatrix(C, offset-1, tag);
	}

	this.wkApply = function(fn, tag) {
		var lb = util.loadBalance(that.nrows, nWorkers, id);
		var C = [];
		var offset = 0;
		for (var i = lb.ifrom; i < lb.ito; ++i) {
			C.push(new Float64Array(that.ncols));
			for (var j = 0; j < that.ncols; ++j) {
				C[offset][j] = fn(A[i][j]);
			}
			++offset;
		}
		gatherMatrix(C, offset-1, tag);
	}

	// matrix-vector multiply: A.v
	this.wkTimesVector = function(v, tag) {
		var lb = util.loadBalance(that.nrows, nWorkers, id);
		var w = new Float64Array(lb.ito - lb.ifrom);
		var offset = 0;
		for (var i = lb.ifrom; i < lb.ito; ++i) {
			var tot = 0.0;
			for (var j = 0; j < that.ncols; ++j) {
				tot += A[i][j] * v.get(j);
			}
			w[offset++] = tot;
		}
		self.postMessage({handle: "gatherVector", tag: tag, id: id,
			len: w.length, vectorPart: w.buffer}, [w.buffer]);
	}
}

MW.Matrix.fromArray = function(arr, mathWorkerId, nWorkersInput) {
	var mat = new MW.Matrix(arr.length, arr[0].length, mathWorkerId, nWorkersInput);
	for (var i = 0; i < arr.length; ++i) {
		for (var j = 0; j < arr[i].length; ++j) {
			mat.set(i, j, arr[i][j]);
		}
	}
	return mat;
}


