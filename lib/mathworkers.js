/**
 *  MathWorkers.js
 *
 *  A JavaScript math library that uses WebWorkers for parallelization
 *
 *  https://github.com/awlange/mathworkers
 *
 *  Copyright 2014 Adrian W. Lange
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  @file MathWorkers.js library
 *  @copyright Adrian W. Lange
 *  @author Adrian W. Lange
 */


var MathWorkers = (function() {
"use strict";

/**
 * The MathWorkers module
 * @exports MW
 */
var MW = {};

// Copyright 2014 Adrian W. Lange

/**
 *  Data available globally only within the MathWorkers class
 *  @inner
 */
var global = {};

// Globally scoped useful variables, defaults
global.workerPool = [];
global.nWorkers = 1;
global.myWorkerId = 0;

global.logLevel = 1;
/**
 * Sets the MathWorkers log level:
 * 1 = warnings and errors only
 * 2 = verbose logging
 * Default is 1.
 *
 * @param {!number} logLevel level to be set
 * @function setLogLevel
 */
MW.setLogLevel = function(logLevel) {
    if (!MW.util.nullOrUndefined(logLevel)) {
        global.logLevel = logLevel;
    }
};

global.unrollLoops = false;
/**
 * Loop unrolling option:
 * If true, use loop unrolled versions of functions if available.
 * If false, do not.
 * Default is false.
 *
 * @param {!boolean} unroll option to be set
 * @function unrollLoops
 */
MW.setUnrollLoops = function(unroll) {
    MW.util.checkNullOrUndefined(unroll);
    global.unrollLoops = unroll;
};

/**
 * Creates the internal Web Worker pool, if Web Worker supported.
 *
 * @ignore
 */
global.createPool = function(nWorkersInput, workerScriptName) {
    MW.util.checkWebWorkerSupport();
	for (var i = 0; i < nWorkersInput; ++i) {
		var worker = new Worker(workerScriptName);
		worker.postMessage({handle: "_init", id: i, nWorkers: nWorkersInput,
            logLevel: global.logLevel, unrollLoops: global.unrollLoops});
		this.workerPool.push(worker);
        this.nWorkers = this.workerPool.length;
	}

	this.getWorker = function(workerId) {
		return this.workerPool[workerId];
	};
};

// Copyright 2014 Adrian W. Lange

/**
 * General utility functions intended for internal use
 *
 * @ignore
 */
MW.util = {};

/**
 * Verify that the environment executing this code has Web Worker support
 *
 * @ignore
 * @throws {Error}
 */
MW.util.checkWebWorkerSupport = function() {
    if (typeof(Worker) === "undefined") {
        throw Error("Web Worker support not available for MathWorkers.");
    }
};

/**
 * Load balancing function.
 * Divides n up evenly among the number of workers in the pool.
 * Any remainder is distributed such that no worker has more than 1 extra piece in its range.
 *
 * @ignore
 * @returns {object} container for range index from (inclusive) and index to (non-inclusive)
 */
MW.util.loadBalance = function(n) {
    var id = global.myWorkerId;
	var div = (n / global.nWorkers)|0;
	var rem = n % global.nWorkers;

	var ifrom;
	var ito;
	if (id < rem) {
		ifrom = id * (div + 1);
		ito = ifrom + div + 1;
	} else {
		ifrom = id * div + rem;
		ito = ifrom + div;
	}

	return {ifrom: ifrom, ito: ito};
};

/**
 * Test if the variable x is null or undefined
 *
 * @ignore
 * @param x variable to be tested
 * @return {boolean} true if x is null or undefined
 */
MW.util.nullOrUndefined = function(x) {
    return x === undefined || x === null;
};

/**
 * Verify that x is neither null nor undefined.
 *
 * @ignore
 * @throws {TypeError}
 */
MW.util.checkNullOrUndefined = function(x) {
    if (MW.util.nullOrUndefined(x)) {
        throw new TypeError("Undefined or null variable.");
    }
};

/**
 * Verify that x is a Number and not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 */
MW.util.checkNumber = function(x) {
    MW.util.checkNullOrUndefined(x);
    if (typeof x != 'number') {
        throw new TypeError("Expected type Number but is type " + typeof x);
    }
};

/**
 * Verify that x is a Function and not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 */
MW.util.checkFunction = function(x) {
    MW.util.checkNullOrUndefined(x);
    if (typeof x != 'function') {
        throw new TypeError("Expected type Function but is type " + typeof x);
    }
};

/**
 * Verify that x is an Array or Float64Array and not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 */
MW.util.checkArray = function(x) {
    MW.util.checkNullOrUndefined(x);
    if (!(x instanceof Array || x instanceof Float64Array)) {
        throw new TypeError("Expected type Array but is type " + typeof x);
    }
};

/**
 * Verify that x is a Float64Array and not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 */
MW.util.checkFloat64Array = function(x) {
    MW.util.checkNullOrUndefined(x);
    if (!(x instanceof Float64Array)) {
        throw new TypeError("Expected type Float64Array but is type " + typeof x);
    }
};

/**
 * Verify that v is a Vector and is not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 */
MW.util.checkVector = function(v) {
    MW.util.checkNullOrUndefined(v);
    if (!(v instanceof MW.Vector)) {
        throw new TypeError("Expected type Vector but is not.");
    }
};

/**
 * Verify that Vectors v and w are equal length and not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 * @throws {Error}
 */
MW.util.checkVectors = function(v, w) {
    MW.util.checkVector(v);
    MW.util.checkVector(w);
    if (v.length !== w.length) {
        throw new Error("Vectors have unequal lengths.");
    }
};

/**
 * Verify that Vector v and Matrix A are compatible for vector-matrix products
 * and are both not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 * @throws {Error}
 */
MW.util.checkVectorMatrix = function(v, A) {
    MW.util.checkVector(v);
    MW.util.checkMatrix(A);
    if (v.length !== A.nrows) {
        throw new Error("Vector length and number Matrix rows are unequal.");
    }
};

/**
 * Verify that A is a Matrix and is not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 */
MW.util.checkMatrix = function(A) {
    MW.util.checkNullOrUndefined(A);
    if (!(A instanceof MW.Matrix)) {
        throw new TypeError("Expected type Matrix but is not.");
    }
};

/**
 * Verify that Matrix A and Matrix B have equal dimensions and are neither null nor undefined
 *
 * @ignore
 * @throws {TypeError}
 * @throws {Error}
 */
MW.util.checkMatrices = function(A, B) {
    MW.util.checkMatrix(A);
    MW.util.checkMatrix(B);
    if (!(A.nrows === B.nrows && A.ncols === B.ncols)) {
        throw new Error("Matrices do not have equal numbers of rows and columns.");
    }
};

/**
 * Verify that Matrix A and Vector v are compatible for matrix-vector products
 * and are both not null or undefined
 *
 * @ignore
 * @throws {TypeError}
 * @throws {Error}
 */
MW.util.checkMatrixVector = function(A, v) {
    MW.util.checkMatrix(A);
    MW.util.checkVector(v);
    if (v.length !== A.ncols) {
        throw new Error("Vector length and number Matrix columns are unequal.");
    }
};

/**
 * Verify that Matrix A and Matrix B have compatible dimensions for matrix-matrix
 * multiplication and are neither null nor undefined
 *
 * @ignore
 * @throws {TypeError}
 * @throws {Error}
 */
MW.util.checkMatrixMatrix = function(A, B) {
    MW.util.checkMatrix(A);
    MW.util.checkMatrix(B);
    if (A.ncols !== B.nrows) {
        throw new Error("Matrices do not have compatible dimensions for matrix-matrix multiplication.");
    }
};

// Copyright 2014 Adrian W. Lange

/**
 * Custom event emitter. To be inherited by classes involving events.
 * Based on example provided here:
 *
 * http://otaqui.com/blog/1374/event-emitter-pub-sub-or-deferred-promises-which-should-you-choose/
 *
 * @constructor
 */
function EventEmitter() {
    var events = {};

    /**
     * Sets an event to listen for
     *
     * @param {!string} name the event name
     * @param {function} callback the callback to be executed when the event is emitted
     */
    this.on = function(name, callback) {
        MW.util.checkFunction(callback);
        events[name] = [callback];
    };

    /**
     * Emits an event and executes the corresponding callback
     *
     * @param {!string} name the event name
     * @param {?Array} args an array of arguments to be passed to the callback
     */
    this.emit = function(name, args) {
        events[name] = events[name] || [];
        args = args || [];
        events[name].forEach( function(fn) {
            fn.call(this, args);
        });
    };
}

// Copyright 2014 Adrian W. Lange

/**
*  Coordinator for browser-side interface.
*  Coordinates the pool of Workers for computations and message passing.
*
*  @param {number} nWorkersInput the number of Workers to spawn in the pool
*  @param {string} workerScriptName the name of the script that the Workers are to execute
*  @constructor
*/
MW.Coordinator = function(nWorkersInput, workerScriptName) {
	var that = this;
	var objectBuffer = {};
	var messageDataBuffer = {};
	this.ready = false;

	// Create the worker pool, which starts the workers
	global.createPool(nWorkersInput, workerScriptName);

    /**
     * Fetches the object buffer contents.
     * After a message from one or more workers is received, the object
     * buffer is usually populated with data.
     *
     * @returns {Object}
     */
	this.getBuffer = function() {
		return objectBuffer;
	};

    /**
     * Fetches the message data list contents.
     * After a message from one or more workers is received, the object
     * buffer is usually populated with data.
     *
     * @returns {Object}
     */
	this.getMessageDataList = function() {
		return messageDataBuffer;
	};

    /**
     * Trigger an event registered by the MathWorker pool to execute.
     *
     * @param {string} tag the unique label for the event being triggered
     * @param {Array} args a list of arguments to be passed to the callback to be executed
     */
	this.trigger = function(tag, args) {
		for (var wk = 0; wk < global.nWorkers; ++wk) {
			global.getWorker(wk).postMessage({handle: "_trigger", tag: tag, args: args});
		}
	};

	this.sendDataToWorkers = function(dat, tag) {
		for (var wk = 0; wk < global.nWorkers; ++wk) {
			global.getWorker(wk).postMessage({handle: "_broadcastData", tag: tag, data: dat});
		}
	};

	this.sendVectorToWorkers = function(vec, tag) {
		// Must make a copy of the vector for each worker for transferable object message passing
		for (var wk = 0; wk < global.nWorkers; ++wk) {
			var v = new Float64Array(vec.array);
			global.getWorker(wk).postMessage({handle: "_broadcastVector", tag: tag,
				vec: v.buffer}, [v.buffer]);
		}
	};

	this.sendMatrixToWorkers = function(mat, tag) {
		// Must make a copy of each matrix row for each worker for transferable object message passing
		for (var wk = 0; wk < global.nWorkers; ++wk) {
			var matObject = {handle: "_broadcastMatrix", tag: tag, nrows: mat.nrows};
			var matBufferList = [];
			for (var i = 0; i < mat.nrows; ++i) {
				var row = new Float64Array(mat.array[i]);
				matObject[i] = row.buffer;
				matBufferList.push(row.buffer);
			}
			global.getWorker(wk).postMessage(matObject, matBufferList);
		}
	};

    // Convenience on ready to hide the handle
    this.onReady = function(callBack) {
        this.on("_ready", callBack);
    };

    /**
     * Route the message appropriately for the Worker
     *
     * @param event
     * @private
     */
 	var onmessageHandler = function(event) {
 		var data = event.data;
 		switch (data.handle) {
 			case "_workerReady":
 				handleWorkerReady();
 				break;
 			case "_sendData":
 				handleSendData(data);
 				break;
 			case "_vectorSendToCoordinator":
 				handleVectorSendToCoordinator(data);
 				break;
 			case "_gatherVector":
 				handleGatherVector(data);
 				break;
 			case "_matrixSendToCoordinator":
 				handleMatrixSendToCoordinator(data);
 				break;
 			 case "_gatherMatrixRows":
 				handleGatherMatrixRows(data);
 				break;
            case "_gatherMatrixColumns":
                handleGatherMatrixColumns(data);
                break;
  			case "_vectorSum":
 				handleVectorSum(data);
 				break;
            case "_vectorProduct":
                handleVectorProduct(data);
                break;
 			default:
 				console.error("Invalid Coordinator handle: " + data.handle);
 		}
 	};

 	// Register the above onmessageHandler for each worker in the pool
 	// Also, initialize the message data buffer with empty objects
 	for (var wk = 0; wk < global.nWorkers; ++wk) {
 		global.getWorker(wk).onmessage = onmessageHandler;
 		messageDataBuffer.push({});
 	}

 	// Reduction function variables
 	var nWorkersReported = 0;

 	var handleWorkerReady = function() {
 		nWorkersReported += 1;
 		if (nWorkersReported == global.nWorkers) {
 			that.ready = true;
 			that.emit("_ready");
 			// reset for next message
			nWorkersReported = 0;	
 		}
 	};

 	var handleSendData = function(data) {
 		messageDataBuffer[data.id] = data.data;
 		nWorkersReported += 1;
 		if (nWorkersReported == global.nWorkers) {
 			that.emit(data.tag);
 			// reset for next message
			nWorkersReported = 0;	
 		}
 	};

	var handleVectorSendToCoordinator = function(data) {
		objectBuffer = new MW.Vector();
		objectBuffer.setVector(new Float64Array(data.vectorBuffer));
		that.emit(data.tag);
	};

	var handleMatrixSendToCoordinator = function(data) {
        var tmp = [];
		for (var i = 0; i < data.nrows; ++i) {
			tmp.push(new Float64Array(data[i]));
		}
		objectBuffer = new MW.Matrix();
		objectBuffer.setMatrix(tmp);
		that.emit(data.tag);
	};

	var handleGatherVector = function(data) {
		// Gather the vector parts from each worker
        if (nWorkersReported == 0) {
            objectBuffer = new MW.Vector(data.len);
        }
        var tmpArray = new Float64Array(data.vectorPart);
        var offset = data.offset;
        for (var i = 0; i < tmpArray.length; ++i) {
            objectBuffer.array[offset + i] = tmpArray[i];
        }

		nWorkersReported += 1;
		if (nWorkersReported == global.nWorkers) {
			if (data.rebroadcast) {
				that.sendVectorToWorkers(objectBuffer, data.tag);
			} else {
				// emit
				that.emit(data.tag);
			}
			// reset
			nWorkersReported = 0;
		}
	};

	var handleGatherMatrixRows = function(data) {
		// Gather the matrix rows from each worker
        var offset = data.offset;
        if (nWorkersReported == 0) {
            objectBuffer = new MW.Matrix(data.nrows, data.ncols);
        }
        for (var i = 0; i < data.nrowsPart; ++i) {
			objectBuffer.array[offset + i] = new Float64Array(data[i]);
		}

		nWorkersReported += 1;
		if (nWorkersReported == global.nWorkers) {
			// build the full vector and save to buffer
			if (data.rebroadcast) {
				that.sendMatrixToWorkers(objectBuffer, data.tag);
			} else {
				// emit
				that.emit(data.tag);
			}
			//reset
			nWorkersReported = 0;
		}
	};

    var handleGatherMatrixColumns = function(data) {
        // Gather the matrix columns from each worker
        var i, k;
        if (nWorkersReported == 0) {
            objectBuffer = new MW.Matrix(data.nrows, data.ncols);
        }

        // array in data is transposed
        var tmpArray;
        var offsetk;
        for (k = 0, offsetk = data.offset; k < data.nrowsPart; ++k, ++offsetk) {
            tmpArray = new Float64Array(data[k]);
            for (i = 0; i < tmpArray.length; ++i) {
                objectBuffer.array[i][offsetk] = tmpArray[i];
            }
        }

        nWorkersReported += 1;
        if (nWorkersReported == global.nWorkers) {
            if (data.rebroadcast) {
                that.sendMatrixToWorkers(objectBuffer, data.tag);
            } else {
                // emit
                that.emit(data.tag);
            }
            //reset
            nWorkersReported = 0;
        }
    };

    var handleVectorSum = function(data) {
        if (nWorkersReported == 0) {
            objectBuffer = data.tot;
        } else {
            objectBuffer += data.tot;
        }
        nWorkersReported += 1;
        if (nWorkersReported == global.nWorkers) {
            if (data.rebroadcast) {
                // rebroadcast the result back to the workers
                that.sendDataToWorkers(objectBuffer, data.tag);
            } else {
                // save result to buffer and emit to the browser-side coordinator
                that.emit(data.tag);
            }
            // reset for next message
            nWorkersReported = 0;
        }
    };

	var handleVectorProduct = function(data) {
        if (nWorkersReported == 0) {
            objectBuffer = data.tot;
        } else {
            objectBuffer *= data.tot;
        }
		nWorkersReported += 1;
		if (nWorkersReported == global.nWorkers) {
			if (data.rebroadcast) {
				// rebroadcast the result back to the workers
				that.sendDataToWorkers(objectBuffer, data.tag);
			} else {
				// save result to buffer and emit to the browser-side coordinator
				that.emit(data.tag);
			}
			// reset for next message
			nWorkersReported = 0;
		}
	};

};
MW.Coordinator.prototype = new EventEmitter();

// Copyright 2014 Adrian W. Lange

/**
 *  MathWorker for worker-side interface
 */
MW.MathWorker = function() {
 	var objectBuffer = {};
 	var triggers = {};

 	this.getId = function() {
 		return global.myWorkerId;
 	};

 	this.getNumWorkers = function() {
 		return global.nWorkers;
 	};

	this.getBuffer = function() {
		return objectBuffer;
	};

 	this.sendDataToCoordinator = function(data, tag) {
 		self.postMessage({handle: "_sendData", id: global.myWorkerId, tag: tag, data: data});
 	};

    this.sendVectorToCoordinator = function(vec, tag) {
        // only id 0 does the sending actually
        if (global.myWorkerId == 0) {
            self.postMessage({handle: "_vectorSendToCoordinator", tag: tag,
                vectorBuffer: vec.array.buffer}, [vec.array.buffer]);
        }
    };

    this.sendMatrixToCoordinator = function(mat, tag) {
        // only id 0 does the sending actually
        if (id == 0) {
            var matObject = {handle: "_matrixSendToCoordinator", tag: tag, nrows: mat.nrows};
            var matBufferList = [];
            for (var i = 0; i < mat.nrows; ++i) {
                matObject[i] = mat.array[i].buffer;
                matBufferList.push(mat.array[i].buffer);
            }
            self.postMessage(matObject, matBufferList);
        }
    };

 	// Route the message appropriately for the Worker
	self.onmessage = function(event) {
		var data = event.data;
		switch (data.handle) {
			case "_init":
				handleInit(data);
				break;
			case "_trigger":
				handleTrigger(data);
				break;
			case "_broadcastData":
				handleBroadcastData(data);
				break;
			case "_broadcastVector":
				handleBroadcastVector(data);
				break;
			case "_broadcastMatrix":
				handleBroadcastMatrix(data);
				break;
 			default:
 				console.error("Invalid MathWorker handle: " + data.handle);
 		}
 	};

 	// registers the callback for a trigger
 	this.on = function(tag, callback) {
        if (global.logLevel > 2) {
            console.log("registering trigger: " + tag);
        }
        triggers[tag] = [callback];
    };

 	var handleInit = function(data) {
        global.myWorkerId = data.id;
        global.nWorkers = data.nWorkers;
        global.unrollLoops = data.unrollLoops;
        global.logLevel = data.logLevel;
 		if (global.logLevel > 2) {
            console.log("Initialized MathWorker: " + global.myWorkerId + " of " + global.nWorkers + " workers.");
        }
        self.postMessage({handle: "_workerReady"});
 	};

 	var handleTrigger = function(data, obj) {
		if (triggers[data.tag]) {
			triggers[data.tag] = triggers[data.tag] || [];
			var args = data.data || obj || [];
			triggers[data.tag].forEach( function(fn) {
				fn.call(this, args);
			});
		} else {
			console.error("Unregistered trigger tag: " + data.tag);
		}
 	};

 	var handleBroadcastData = function(data) {
 		objectBuffer = data.data;
 		handleTrigger(data);
 	};

 	var handleBroadcastVector = function(data) {
 		objectBuffer = MW.Vector.fromArray(new Float64Array(data.vec));
 		handleTrigger(data, objectBuffer);
 	};

 	var handleBroadcastMatrix = function(data) {
 		var tmp = [];
		for (var i = 0; i < data.nrows; ++i) {
			tmp.push(new Float64Array(data[i]));
		}
		objectBuffer = new MW.Matrix();
		objectBuffer.setMatrix(tmp);
 		handleTrigger(data, objectBuffer);
 	};
};
MW.MathWorker.prototype = new EventEmitter();


/**
 * MathWorker static-like functions
 */
MW.MathWorker.gatherVector = function(vec, totalLength, offset, tag, rebroadcast) {
    rebroadcast = rebroadcast || false;
    self.postMessage({handle: "_gatherVector", tag: tag, id: global.myWorkerId, rebroadcast: rebroadcast,
        len: totalLength, offset: offset, vectorPart: vec.buffer}, [vec.buffer]);
};

MW.MathWorker.gatherMatrixRows = function(mat, totalRows, offset, tag, rebroadcast) {
    rebroadcast = rebroadcast || false;
    var matObject = {handle: "_gatherMatrixRows", tag: tag, id: global.myWorkerId, rebroadcast: rebroadcast,
        nrows: totalRows, ncols: mat[0].length, nrowsPart: mat.length, offset: offset};
    var matBufferList = [];
    for (var i = 0; i < mat.length; ++i) {
        matObject[i] = mat[i].buffer;
        matBufferList.push(mat[i].buffer);
    }
    self.postMessage(matObject, matBufferList);
};

MW.MathWorker.gatherMatrixColumns = function(mat, totalRows, totalCols, offset, tag, rebroadcast) {
    rebroadcast = rebroadcast || false;
    var matObject = {handle: "_gatherMatrixColumns", tag: tag, id: global.myWorkerId, rebroadcast: rebroadcast,
        nrows: totalRows, ncols: totalCols, nrowsPart: mat.length, offset: offset};
    var matBufferList = [];
    for (var i = 0; i < mat.length; ++i) {
        matObject[i] = mat[i].buffer;
        matBufferList.push(mat[i].buffer);
    }
    self.postMessage(matObject, matBufferList);
};

MW.MathWorker.reduceVectorSum = function(tot, tag, rebroadcast) {
    rebroadcast = rebroadcast || false;
    self.postMessage({handle: "_vectorSum", tag: tag, rebroadcast: rebroadcast, tot: tot});
};

MW.MathWorker.reduceVectorProduct = function(tot, tag, rebroadcast) {
    rebroadcast = rebroadcast || false;
    self.postMessage({handle: "_vectorProduct", tag: tag, rebroadcast: rebroadcast, tot: tot});
};


// Copyright 2014 Adrian W. Lange

/**
 *  Vector class.
 *  A wrapper around a Float64Array with several vector operations defined.
 *
 *  @class
 */
MW.Vector = function(size) {
    this.array = null;
    this.length = size || 0;
    if (size > 0) {
        this.array = new Float64Array(size);
    }
};

// Deep copy the array
MW.Vector.fromArray = function(arr) {
    MW.util.checkArray(arr);
    var vec = new MW.Vector(arr.length);
    for (var i = 0, ni = arr.length; i < ni; ++i) {
        vec.array[i] = arr[i];
    }
    return vec;
};

MW.Vector.prototype.setVector = function(arr) {
    MW.util.checkFloat64Array(arr);
    this.array = arr;
    this.length = arr.length;
};

MW.Vector.zeroes = function(size) {
    var vec = new Vector(size);
    for (var i = 0; i < size; ++i) {
        vec.array[i] = 0.0;
    }
    return vec;
};

MW.Vector.randomVector = function(size) {
    var vec = new Vector(size);
    for (var i = 0; i < size; ++i) {
        vec.array[i] = Math.random();
    }
    return vec;
};

MW.Vector.prototype.toString = function() {
    var str = "[";
    for (var i = 0; i < this.length - 1; ++i) {
        str += this.array[i] + ", ";
    }
    return str + this.array[this.length-1] + "]";
};

MW.Vector.prototype.sum = function() {
    var result = 0.0;
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result += this.array[i] + this.array[i+1] + this.array[i+2] + this.array[i+3];
        }
        for (; i < ni; ++i) {
            result += this.array[i];
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result += this.array[i];
        }
    }
    return result;
};

MW.Vector.prototype.product = function() {
    var result = 1.0;
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result *= this.array[i] * this.array[i+1] * this.array[i+2] * this.array[i+3];
        }
        for (; i < ni; ++i) {
            result *= this.array[i];
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result *= this.array[i];
        }
    }
    return result;
};

MW.Vector.prototype.plus = function(w) {
    MW.util.checkVectors(this, w);
    var result = new MW.Vector(this.length);
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result.array[i] = this.array[i] + w.array[i];
            result.array[i+1] = this.array[i+1] + w.array[i+1];
            result.array[i+2] = this.array[i+2] + w.array[i+2];
            result.array[i+3] = this.array[i+3] + w.array[i+3];
        }
        for (; i < ni; ++i) {
            result.array[i] = this.array[i] + w.array[i];
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result.array[i] = this.array[i] + w.array[i];
        }
    }
    return result;
};

MW.Vector.prototype.minus = function(w) {
    MW.util.checkVectors(this, w);
    var result = new MW.Vector(this.length);
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result.array[i] = this.array[i] - w.array[i];
            result.array[i+1] = this.array[i+1] - w.array[i+1];
            result.array[i+2] = this.array[i+2] - w.array[i+2];
            result.array[i+3] = this.array[i+3] - w.array[i+3];
        }
        for (; i < ni; ++i) {
            result.array[i] = this.array[i] - w.array[i];
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result.array[i] = this.array[i] - w.array[i];
        }
    }
    return result;
};

MW.Vector.prototype.times = function(w) {
    MW.util.checkVectors(this, w);
    var result = new MW.Vector(this.length);
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result.array[i] = this.array[i] * w.array[i];
            result.array[i+1] = this.array[i+1] * w.array[i+1];
            result.array[i+2] = this.array[i+2] * w.array[i+2];
            result.array[i+3] = this.array[i+3] * w.array[i+3];
        }
        for (; i < ni; ++i) {
            result.array[i] = this.array[i] * w.array[i];
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result.array[i] = this.array[i] * w.array[i];
        }
    }
    return result;
};

MW.Vector.prototype.divide = function(w) {
    MW.util.checkVectors(this, w);
    var result = new MW.Vector(this.length);
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result.array[i] = this.array[i] / w.array[i];
            result.array[i+1] = this.array[i+1] / w.array[i+1];
            result.array[i+2] = this.array[i+2] / w.array[i+2];
            result.array[i+3] = this.array[i+3] / w.array[i+3];
        }
        for (; i < ni; ++i) {
            result.array[i] = this.array[i] / w.array[i];
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result.array[i] = this.array[i] / w.array[i];
        }
    }
    return result;
};

MW.Vector.prototype.scale = function(alpha) {
    MW.util.checkNumber(alpha);
    var result = new MW.Vector(this.length);
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result.array[i] = this.array[i] * alpha;
            result.array[i+1] = this.array[i+1] * alpha;
            result.array[i+2] = this.array[i+2] * alpha;
            result.array[i+3] = this.array[i+3] * alpha;
        }
        for (; i < ni; ++i) {
            result.array[i] = this.array[i] * alpha;
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result.array[i] = this.array[i] * alpha;
        }
    }
    return result;
};

MW.Vector.prototype.apply = function(fn) {
    MW.util.checkFunction(fn);
    var result = new MW.Vector(this.length);
    var i;
    var ni = this.length;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            result.array[i] = fn(this.array[i]);
            result.array[i+1] = fn(this.array[i+1]);
            result.array[i+2] = fn(this.array[i+2]);
            result.array[i+3] = fn(this.array[i+3]);
        }
        for (; i < ni; ++i) {
            result.array[i] = fn(this.array[i]);
        }
    } else {
        for (i = 0; i < ni; ++i) {
            result.array[i] = fn(this.array[i]);
        }
    }
    return result;
};

MW.Vector.prototype.dotVector = function(w) {
    MW.util.checkVectors(this, w);
    var i;
    var ni = this.length;
    var tot = 0.0;
    if (global.unrollLoops) {
        var ni3 = ni - 3;
        for (i = 0; i < ni3; i += 4) {
            tot += this.array[i] * w.array[i]
                + this.array[i+1] * w.array[i+1]
                + this.array[i+2] * w.array[i+2]
                + this.array[i+3] * w.array[i+3];
        }
        for (; i < ni; ++i) {
            tot += this.array[i] * w.array[i];
        }
    } else {
        for (i = 0; i < ni; ++i) {
            tot += this.array[i] * w.array[i];
        }
    }
    return tot;
};

// vector-matrix multiply: v.A
MW.Vector.prototype.dotMatrix = function(A) {
    MW.util.checkVectorMatrix(this, A);
    var i, j, tot;
    var ni = A.ncols;
    var nj = this.length;
    var w = new MW.Vector(ni);
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            tot = 0.0;
            for (j = 0; j < nj3; j += 4) {
                tot += this.array[j] * A.array[j][i]
                    + this.array[j+1] * A.array[j+1][i]
                    + this.array[j+2] * A.array[j+2][i]
                    + this.array[j+3] * A.array[j+3][i];
            }
            for (; j < nj; ++j) {
                tot += this.array[j] * A.array[j][i];
            }
            w.array[i] = tot;
        }
    } else {
        for (i = 0; i < ni; ++i) {
            tot = 0.0;
            for (j = 0; j < nj; ++j) {
                tot += this.array[j] * A.array[j][i];
            }
            w.array[i] = tot;
        }
    }
    return w;
};


// Copyright 2014 Adrian W. Lange

/**
 * Worker versions of the Vector methods
 */

MW.Vector.prototype.wkSum = function(tag, rebroadcast) {
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var tot = 0.0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            tot += this.array[i] + this.array[i+1] + this.array[i+2] + this.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            tot += this.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            tot += this.array[i];
        }
    }
    MW.MathWorker.reduceVectorSum(tot, tag, rebroadcast);
};

MW.Vector.prototype.wkProduct = function(tag, rebroadcast) {
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var tot = 1.0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            tot *= this.array[i] * this.array[i+1] * this.array[i+2] * this.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            tot *= this.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            tot *= this.array[i];
        }
    }
    MW.MathWorker.reduceVectorProduct(tot, tag, rebroadcast);
};


MW.Vector.prototype.wkPlus = function(w, tag, rebroadcast) {
    MW.util.checkVectors(this, w);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var x = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            x[offset++] = this.array[i] + w.array[i];
            x[offset++] = this.array[i+1] + w.array[i+1];
            x[offset++] = this.array[i+2] + w.array[i+2];
            x[offset++] = this.array[i+3] + w.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            x[offset++] = this.array[i] + w.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            x[offset++] = this.array[i] + w.array[i];
        }
    }
    MW.MathWorker.gatherVector(x, this.length, lb.ifrom, tag, rebroadcast);
};

MW.Vector.prototype.wkMinus = function(w, tag, rebroadcast) {
    MW.util.checkVectors(this, w);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var x = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            x[offset++] = this.array[i] - w.array[i];
            x[offset++] = this.array[i+1] - w.array[i+1];
            x[offset++] = this.array[i+2] - w.array[i+2];
            x[offset++] = this.array[i+3] - w.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            x[offset++] = this.array[i] - w.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            x[offset++] = this.array[i] - w.array[i];
        }
    }
    MW.MathWorker.gatherVector(x, this.length, lb.ifrom, tag, rebroadcast);
};

MW.Vector.prototype.wkTimes = function(w, tag, rebroadcast) {
    MW.util.checkVectors(this, w);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var x = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            x[offset++] = this.array[i] * w.array[i];
            x[offset++] = this.array[i+1] * w.array[i+1];
            x[offset++] = this.array[i+2] * w.array[i+2];
            x[offset++] = this.array[i+3] * w.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            x[offset++] = this.array[i] * w.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            x[offset++] = this.array[i] * w.array[i];
        }
    }
    MW.MathWorker.gatherVector(x, this.length, lb.ifrom, tag, rebroadcast);
};

MW.Vector.prototype.wkDivide = function(w, tag, rebroadcast) {
    MW.util.checkVectors(this, w);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var x = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            x[offset++] = this.array[i] / w.array[i];
            x[offset++] = this.array[i+1] / w.array[i+1];
            x[offset++] = this.array[i+2] / w.array[i+2];
            x[offset++] = this.array[i+3] / w.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            x[offset++] = this.array[i] / w.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            x[offset++] = this.array[i] / w.array[i];
        }
    }
    MW.MathWorker.gatherVector(x, this.length, lb.ifrom, tag, rebroadcast);
};

MW.Vector.prototype.wkScale = function(alpha, tag, rebroadcast) {
    MW.util.checkNumber(alpha);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var x = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            x[offset++] = this.array[i] * alpha;
            x[offset++] = this.array[i+1] * alpha;
            x[offset++] = this.array[i+2] * alpha;
            x[offset++] = this.array[i+3] * alpha;
        }
        for (; i < lb.ito; ++i) {
            x[offset++] = this.array[i] * alpha;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            x[offset++] = this.array[i] * alpha;
        }
    }
    MW.MathWorker.gatherVector(x, this.length, lb.ifrom, tag, rebroadcast);
};

MW.Vector.prototype.wkApply = function(fn, tag, rebroadcast) {
    MW.util.checkFunction(fn);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var x = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    var i;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            x[offset++] = fn(this.array[i]);
            x[offset++] = fn(this.array[i+1]);
            x[offset++] = fn(this.array[i+2]);
            x[offset++] = fn(this.array[i+3]);
        }
        for (; i < lb.ito; ++i) {
            x[offset++] = fn(this.array[i]);
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            x[offset++] = fn(this.array[i]);
        }
    }
    MW.MathWorker.gatherVector(x, this.length, lb.ifrom, tag, rebroadcast);
};

MW.Vector.prototype.wkDotVector = function(w, tag, rebroadcast) {
    MW.util.checkVectors(this, w);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.length);
    var i;
    var tot = 0.0;
    if (global.unrollLoops) {
        var ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; i += 4) {
            tot += this.array[i] * w.array[i]
                + this.array[i+1] * w.array[i+1]
                + this.array[i+2] * w.array[i+2]
                + this.array[i+3] * w.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            tot += this.array[i] * w.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            tot += this.array[i] * w.array[i];
        }
    }
    MW.MathWorker.reduceVectorSum(tot, tag, rebroadcast);
};

// vector-matrix multiply: v.A
MW.Vector.prototype.wkDotMatrix = function(A, tag, rebroadcast) {
    MW.util.checkVectorMatrix(this, A);
    MW.util.checkNullOrUndefined(tag);
    var i, j;
    var nj = this.length;
    var lb = MW.util.loadBalance(A.ncols);
    var w = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            tot = 0.0;
            for (j = 0; j < nj3; j += 4) {
                tot += this.array[j] * A.array[j][i]
                    + this.array[j+1] * A.array[j+1][i]
                    + this.array[j+2] * A.array[j+2][i]
                    + this.array[j+3] * A.array[j+3][i];
            }
            for (; j < nj; ++j) {
                tot += this.array[j] * A.array[j][i];
            }
            w[offset++] = tot;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            var tot = 0.0;
            for (j = 0; j < nj; ++j) {
                tot += this.array[j] * A.array[j][i];
            }
            w[offset++] = tot;
        }
    }
    MW.MathWorker.gatherVector(w, this.length, lb.ifrom, tag, rebroadcast);
};// Copyright 2014 Adrian W. Lange

/**
 *  Matrix class
 *
 *  A wrapper around an array of Float64Array objects
 */
MW.Matrix = function(nrows, ncols) {
    this.array = [];
    this.nrows = nrows || 0;
    this.ncols = ncols || 0;

    if (nrows > 0 && ncols > 0) {
        this.array = new Array(nrows);
        for (var r = 0; r < nrows; ++r) {
            this.array[r] = new Float64Array(ncols);
        }
    }
};

// Deep copy the array
MW.Matrix.fromArray = function(arr) {
    MW.util.checkArray(arr);
    var mat = new MW.Matrix(arr.length, arr[0].length);
    var i, j, nj;
    var ni = arr.length;
    for (i = 0; i < ni; ++i) {
        nj = arr[i].length;
        for (j = 0; j < nj; ++j) {
            mat.array[i][j] = arr[i][j];
        }
    }
    return mat;
};

MW.Matrix.prototype.setMatrix = function(arr) {
    MW.util.checkArray(arr);
    MW.util.checkFloat64Array(arr[0]);
    this.array = arr;
    this.nrows = arr.length;
    this.ncols = arr[0].length;
};

MW.Matrix.prototype.copyColumn = function(j, vec) {
    for (var i = 0, ni = this.nrows; i < ni; ++i) {
        vec[i] = this.array[i][j];
    }
};

MW.Matrix.prototype.copyRow = function(i, vec) {
    for (var j = 0, nj = this.ncols; j < nj; ++j) {
        vec[j] = this.array[i][j];
    }
};

MW.Matrix.prototype.isSquare = function() {
    return this.nrows == this.ncols;
};

MW.Matrix.zeroes = function(n, m) {
    var mat = new MW.Matrix(n, m);
    for (var i = 0; i < n; ++i) {
        for (var j = 0; j < m; ++j) {
            mat.array[i][j] = 0.0;
        }
    }
    return mat;
};

MW.Matrix.identity = function(n) {
    var mat = new MW.Matrix(n, n);
    for (var i = 0; i < n; ++i) {
        for (var j = 0; j < n; ++j) {
            mat.array[i][j] = 0.0;
        }
        mat.array[i][i] = 1.0;
    }
    return mat;
};

MW.Matrix.randomMatrix = function(nrows, ncols) {
    var mat = new Matrix(nrows, ncols);
    for (var i = 0; i < nrows; ++i) {
        for (var j = 0; j < ncols; ++j) {
            mat.array[i][j] = Math.random();
        }
    }
    return mat;
};

MW.Matrix.prototype.toString = function() {
    var str = "";
    for (var i = 0; i < this.nrows; ++i) {
        var row = "[";
        for (var j = 0; j < this.ncols - 1; ++j) {
            row += this.array[i][j] + ", ";
        }
        str += row + this.array[i][this.ncols-1] + "]";
        if (i != this.nrows - 1) {
            str += "\n";
        }
    }
    return str;
};

MW.Matrix.prototype.plus = function(B) {
    MW.util.checkMatrices(this, B);
    var C = new MW.Matrix(this.nrows, this.ncols);
    var i, j, ai, bi;
    var ni = this.nrows;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj3; j += 4) {
                C.array[i][j] = ai[j] + bi[j];
                C.array[i][j+1] = ai[j+1] + bi[j+1];
                C.array[i][j+2] = ai[j+2] + bi[j+2];
                C.array[i][j+3] = ai[j+3] + bi[j+3];
            }
            for (; j < nj; ++j) {
                C.array[i][j] = ai[j] + bi[j];
            }
        }
    } else {
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj; ++j) {
                C.array[i][j] = ai[j] + bi[j];
            }
        }
    }
    return C;
};

MW.Matrix.prototype.minus = function(B) {
    MW.util.checkMatrices(this, B);
    var C = new MW.Matrix(this.nrows, this.ncols);
    var i, j, ai, bi;
    var ni = this.nrows;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj3; j += 4) {
                C.array[i][j] = ai[j] - bi[j];
                C.array[i][j+1] = ai[j+1] - bi[j+1];
                C.array[i][j+2] = ai[j+2] - bi[j+2];
                C.array[i][j+3] = ai[j+3] - bi[j+3];
            }
            for (; j < nj; ++j) {
                C.array[i][j] = ai[j] - bi[j];
            }
        }
    } else {
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj; ++j) {
                C.array[i][j] = ai[j] - bi[j];
            }
        }
    }
    return C;
};

MW.Matrix.prototype.times = function(B) {
    MW.util.checkMatrices(this, B);
    var C = new MW.Matrix(this.nrows, this.ncols);
    var i, j, ai, bi;
    var ni = this.nrows;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj3; j += 4) {
                C.array[i][j] = ai[j] * bi[j];
                C.array[i][j+1] = ai[j+1] * bi[j+1];
                C.array[i][j+2] = ai[j+2] * bi[j+2];
                C.array[i][j+3] = ai[j+3] * bi[j+3];
            }
            for (; j < nj; ++j) {
                C.array[i][j] = ai[j] * bi[j];
            }
        }
    } else {
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj; ++j) {
                C.array[i][j] = ai[j] * bi[j];
            }
        }
    }
    return C;
};

MW.Matrix.prototype.divide = function(B) {
    MW.util.checkMatrices(this, B);
    var C = new MW.Matrix(this.nrows, this.ncols);
    var i, j, ai, bi;
    var ni = this.nrows;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj3; j += 4) {
                C.array[i][j] = ai[j] / bi[j];
                C.array[i][j+1] = ai[j+1] / bi[j+1];
                C.array[i][j+2] = ai[j+2] / bi[j+2];
                C.array[i][j+3] = ai[j+3] / bi[j+3];
            }
            for (; j < nj; ++j) {
                C.array[i][j] = ai[j] / bi[j];
            }
        }
    } else {
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            bi = B.array[i];
            for (j = 0; j < nj; ++j) {
                C.array[i][j] = ai[j] / bi[j];
            }
        }
    }
    return C;
};

MW.Matrix.prototype.scale = function(alpha) {
    MW.util.checkNumber(alpha);
    var C = new MW.Matrix(this.nrows, this.ncols);
    var i, j, ai;
    var ni = this.nrows;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            for (j = 0; j < nj3; j += 4) {
                C.array[i][j] = ai[j] * alpha;
                C.array[i][j+1] = ai[j+1] * alpha;
                C.array[i][j+2] = ai[j+2] * alpha;
                C.array[i][j+3] = ai[j+3] * alpha;
            }
            for (; j < nj; ++j) {
                C.array[i][j] = ai[j] * alpha;
            }
        }
    } else {
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            for (j = 0; j < nj; ++j) {
                C.array[i][j] = ai[j] * alpha;
            }
        }
    }
    return C;
};

MW.Matrix.prototype.apply = function(fn) {
    MW.util.checkFunction(fn);
    var C = new MW.Matrix(this.nrows, this.ncols);
    var i, j, ai;
    var ni = this.nrows;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            for (j = 0; j < nj3; j += 4) {
                C.array[i][j] = fn(ai[j]);
                C.array[i][j+1] = fn(ai[j+1]);
                C.array[i][j+2] = fn(ai[j+2]);
                C.array[i][j+3] = fn(ai[j+3]);
            }
            for (; j < nj; ++j) {
                C.array[i][j] = fn(ai[j]);
            }
        }
    } else {
        for (i = 0; i < ni; ++i) {
            ai = this.array[i];
            for (j = 0; j < nj; ++j) {
                C.array[i][j] = fn(ai[j]);
            }
        }
    }
    return C;
};

// Allocate new matrix and return to allow for arbitrary shaped matrices
MW.Matrix.prototype.transpose = function() {
    var B = new MW.Matrix(this.ncols, this.nrows);
    var i, j, ai;
    var ni = this.nrows;
    var nj = this.ncols;
    for (i = 0; i < ni; ++i) {
        ai = this.array[i];
        for (j = 0; j < nj; ++j) {
            B.array[j][i] = ai[j];
        }
    }
    return B;
};

// Only works for square matrices
MW.Matrix.prototype.transposeInPlace = function() {
    if (this.isSquare()) {
        var i, j;
        var ni = this.nrows;
        var nj = this.ncols;
        for (i = 0; i < ni; ++i) {
            for (j = i + 1; j < nj; ++j) {
                var tmp = this.array[i][j];
                this.array[i][j] = this.array[j][i];
                this.array[j][i] = tmp;
            }
        }
    } else {
        throw new Error("In place transpose only available for square matrices.");
    }
    return this;
};

// matrix-vector multiply: A.v
MW.Matrix.prototype.dotVector = function(v) {
    MW.util.checkMatrixVector(this, v);
    var w = new MW.Vector(this.nrows);
    var tot;
    var i, j;
    var ni = this.nrows;
    var nj = this.ncols;
    var ai;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = 0; i < ni; ++i) {
            tot = 0.0;
            ai = this.array[i];
            for (j = 0; j < nj3; j += 4) {
                tot += ai[j] * v.array[j]
                    + ai[j+1] * v.array[j+1]
                    + ai[j+2] * v.array[j+2]
                    + ai[j+3] * v.array[j+3];
            }
            for (; j < nj; ++j) {
                tot += ai[j] * v.array[j];
            }
            w.array[i] = tot;
        }
    } else {
        for (i = 0; i < ni; ++i) {
            tot = 0.0;
            ai = this.array[i];
            for (j = 0; j < nj; ++j) {
                tot += ai[j] * v.array[j];
            }
            w.array[i] = tot;
        }
    }
    return w;
};

// matrix-matrix multiply: A.B
MW.Matrix.prototype.dotMatrix = function(B) {
    MW.util.checkMatrixMatrix(this, B);
    var C = new MW.Matrix(this.nrows, B.ncols);

    var i, j, k, tot, ai;
    var ni = this.nrows;
    var nj = this.ncols;
    var nk = B.ncols;

    var Bk = new Float64Array(nj);
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (k = 0; k < nk; ++k) {
            B.copyColumn(k, Bk);
            for (i = 0; i < ni; ++i) {
                tot = 0.0;
                ai = this.array[i];
                for (j = 0; j < nj3; j += 4) {
                    tot += ai[j] * Bk[j]
                        + ai[j+1] * Bk[j+1]
                        + ai[j+2] * Bk[j+2]
                        + ai[j+3] * Bk[j+3];
                }
                for (; j < nj; ++j) {
                    tot += ai[j] * Bk[j];
                }
                C.array[i][k] = tot;
            }
        }
    } else {
        for (k = 0; k < nk; ++k) {
            B.copyColumn(k, Bk);
            for (i = 0; i < ni; ++i) {
                tot = 0.0;
                ai = this.array[i];
                for (j = 0; j < nj; ++j) {
                    tot += ai[j] * Bk[j];
                }
                C.array[i][k] = tot;
            }
        }
    }
    return C;
};

// Copyright 2014 Adrian W. Lange

/**
 * Worker versions of the Matrix methods
 */

MW.Matrix.prototype.wkPlus = function(B, tag, rebroadcast) {
    MW.util.checkMatrices(this, B);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var C = [];
    var offset = 0;
    var i, j, ai, bi, co;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj3; j += 4) {
                co[j] = ai[j] + bi[j];
                co[j+1] = ai[j+1] + bi[j+1];
                co[j+2] = ai[j+2] + bi[j+2];
                co[j+3] = ai[j+3] + bi[j+3];
            }
            for (; j < nj; ++j) {
                co[j] = ai[j] + bi[j];
            }
            ++offset;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj; ++j) {
                co[j] = ai[j] + bi[j];
            }
            ++offset;
        }
    }
    MW.MathWorker.gatherMatrixRows(C, this.nrows, lb.ifrom, tag, rebroadcast);
};

MW.Matrix.prototype.wkMinus = function(B, tag, rebroadcast) {
    MW.util.checkMatrices(this, B);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var C = [];
    var offset = 0;
    var i, j, ai, bi, co;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj3; j += 4) {
                co[j] = ai[j] - bi[j];
                co[j+1] = ai[j+1] - bi[j+1];
                co[j+2] = ai[j+2] - bi[j+2];
                co[j+3] = ai[j+3] - bi[j+3];
            }
            for (; j < nj; ++j) {
                co[j] = ai[j] - bi[j];
            }
            ++offset;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj; ++j) {
                co[j] = ai[j] - bi[j];
            }
            ++offset;
        }
    }
    MW.MathWorker.gatherMatrixRows(C, this.nrows, lb.ifrom, tag, rebroadcast);
};

MW.Matrix.prototype.wkTimes = function(B, tag, rebroadcast) {
    MW.util.checkMatrices(this, B);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var C = [];
    var offset = 0;
    var i, j, ai, bi, co;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj3; j += 4) {
                co[j] = ai[j] * bi[j];
                co[j+1] = ai[j+1] * bi[j+1];
                co[j+2] = ai[j+2] * bi[j+2];
                co[j+3] = ai[j+3] * bi[j+3];
            }
            for (; j < nj; ++j) {
                co[j] = ai[j] * bi[j];
            }
            ++offset;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj; ++j) {
                co[j] = ai[j] * bi[j];
            }
            ++offset;
        }
    }
    MW.MathWorker.gatherMatrixRows(C, this.nrows, lb.ifrom, tag, rebroadcast);
};

MW.Matrix.prototype.wkDivide = function(B, tag, rebroadcast) {
    MW.util.checkMatrices(this, B);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var C = [];
    var offset = 0;
    var i, j, ai, bi, co;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj3; j += 4) {
                co[j] = ai[j] / bi[j];
                co[j+1] = ai[j+1] / bi[j+1];
                co[j+2] = ai[j+2] / bi[j+2];
                co[j+3] = ai[j+3] / bi[j+3];
            }
            for (; j < nj; ++j) {
                co[j] = ai[j] / bi[j];
            }
            ++offset;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            bi = B.array[i];
            co = C[offset];
            for (j = 0; j < nj; ++j) {
                co[j] = ai[j] / bi[j];
            }
            ++offset;
        }
    }
    MW.MathWorker.gatherMatrixRows(C, this.nrows, lb.ifrom, tag, rebroadcast);
};

MW.Matrix.prototype.wkScale = function(alpha, tag, rebroadcast) {
    MW.util.checkNumber(alpha);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var C = [];
    var offset = 0;
    for (var i = lb.ifrom; i < lb.ito; ++i) {
        C.push(new Float64Array(this.ncols));
        for (var j = 0; j < this.ncols; ++j) {
            C[offset][j] = alpha * this.array[i][j];
        }
        ++offset;
    }
    MW.MathWorker.gatherMatrixRows(C, this.nrows, lb.ifrom, tag, rebroadcast);
};

MW.Matrix.prototype.wkScale = function(alpha, tag, rebroadcast) {
    MW.util.checkNumber(alpha);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var C = [];
    var offset = 0;
    var i, j, ai, co;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            co = C[offset];
            for (j = 0; j < nj3; j += 4) {
                co[j] = ai[j] * alpha;
                co[j+1] = ai[j+1] * alpha;
                co[j+2] = ai[j+2] * alpha;
                co[j+3] = ai[j+3] * alpha;
            }
            for (; j < nj; ++j) {
                co[j] = ai[j] * alpha;
            }
            ++offset;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            co = C[offset];
            for (j = 0; j < nj; ++j) {
                co[j] = ai[j] * alpha;
            }
            ++offset;
        }
    }
    MW.MathWorker.gatherMatrixRows(C, this.nrows, lb.ifrom, tag, rebroadcast);
};

MW.Matrix.prototype.wkApply = function(fn, tag, rebroadcast) {
    MW.util.checkFunction(fn);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var C = [];
    var offset = 0;
    var i, j, ai, co;
    var nj = this.ncols;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            co = C[offset];
            for (j = 0; j < nj3; j += 4) {
                co[j] = fn(ai[j]);
                co[j+1] = fn(ai[j+1]);
                co[j+2] = fn(ai[j+2]);
                co[j+3] = fn(ai[j+3]);
            }
            for (; j < nj; ++j) {
                co[j] = fn(ai[j]);
            }
            ++offset;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            C.push(new Float64Array(nj));
            ai = this.array[i];
            co = C[offset];
            for (j = 0; j < nj; ++j) {
                co[j] = fn(ai[j]);
            }
            ++offset;
        }
    }
    MW.MathWorker.gatherMatrixRows(C, this.nrows, lb.ifrom, tag, rebroadcast);
};

// matrix-vector multiply: A.v
MW.Matrix.prototype.wkDotVector = function(v, tag, rebroadcast) {
    MW.util.checkMatrixVector(this, v);
    MW.util.checkNullOrUndefined(tag);
    var lb = MW.util.loadBalance(this.nrows);
    var w = new Float64Array(lb.ito - lb.ifrom);
    var i, j, tot, ai;
    var nj = this.ncols;
    var offset = 0;
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (i = lb.ifrom; i < lb.ito; ++i) {
            ai = this.array[i];
            tot = 0.0;
            for (j = 0; j < nj3; j += 4) {
                tot += ai[j] * v.array[j]
                    + ai[j+1] * v.array[j+1]
                    + ai[j+2] * v.array[j+2]
                    + ai[j+3] * v.array[j+3];
            }
            for (; j < nj; ++j) {
                tot += ai[j] * v.array[j];
            }
            w[offset++] = tot;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            ai = this.array[i];
            tot = 0.0;
            for (j = 0; j < nj; ++j) {
                tot += ai[j] * v.array[j];
            }
            w[offset++] = tot;
        }
    }
    MW.MathWorker.gatherVector(w, v.length, lb.ifrom, tag, rebroadcast);
};

// C = A.B
MW.Matrix.prototype.wkDotMatrix = function(B, tag, rebroadcast) {
    MW.util.checkMatrixMatrix(this, B);
    MW.util.checkNullOrUndefined(tag);

    var i, j, k, tot, ai;
    var ni = this.nrows;
    var nj = this.ncols;
    var lb = MW.util.loadBalance(B.ncols);
    var nk = lb.ito - lb.ifrom;

    // transposed
    var C = new Array(nk);
    for (k = 0; k < nk; ++k) {
        C[k] = new Float64Array(ni);
    }

    var Bk = new Float64Array(nj);
    if (global.unrollLoops) {
        var nj3 = nj - 3;
        for (k = 0; k < nk; ++k) {
            B.copyColumn(lb.ifrom + k, Bk);
            for (i = 0; i < ni; ++i) {
                tot = 0.0;
                ai = this.array[i];
                for (j = 0; j < nj3; j += 4) {
                    tot += ai[j] * Bk[j]
                        + ai[j+1] * Bk[j+1]
                        + ai[j+2] * Bk[j+2]
                        + ai[j+3] * Bk[j+3];
                }
                for (; j < nj; ++j) {
                    tot += ai[j] * Bk[j];
                }
                C[k][i] = tot;
            }
        }
    } else {
        for (k = 0; k < nk; ++k) {
            B.copyColumn(lb.ifrom + k, Bk);
            for (i = 0; i < ni; ++i) {
                tot = 0.0;
                ai = this.array[i];
                for (j = 0; j < nj; ++j) {
                    tot += ai[j] * Bk[j];
                }
                C[k][i] = tot;
            }
        }
    }

    MW.MathWorker.gatherMatrixColumns(C, this.nrows, B.ncols, lb.ifrom, tag, rebroadcast);
};// Copyright 2014 Adrian W. Lange

/**
 *  Batch-operation methods
 *
 *  Combine multiple primitive Vector and/or Matrix operations into a single
 *  method call, reducing some overhead, especially with regard to communication.
 */

// TODO: Finish unrolling these guys

MW.BatchOperation = {};

MW.BatchOperation.wkVectorLinearCombination = function(vectors, coefficients, tag, rebroadcast) {
    MW.util.checkNumber(coefficients[0]);
    MW.util.checkVector(vectors[0]);
    MW.util.checkNullOrUndefined(tag);

    // First combo initializes x
    var i, a, ni3;
    var offset = 0;
    var vec = vectors[0];
    var coeff = coefficients[0];
    var lb = MW.util.loadBalance(vec.length);
    var x = new Float64Array(lb.ito - lb.ifrom);
    if (global.unrollLoops) {
        ni3 = lb.ito - 3;
        for (i = lb.ifrom; i < ni3; ++i) {
            x[offset++] = coeff * vec.array[i];
            x[offset++] = coeff * vec.array[i+1];
            x[offset++] = coeff * vec.array[i+2];
            x[offset++] = coeff * vec.array[i+3];
        }
        for (; i < lb.ito; ++i) {
            x[offset++] = coeff * vec.array[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            x[offset++] = coeff * vec.array[i];
        }
    }

    // Remaining combos
    for (a = 1; a < vectors.length; ++a) {
        offset = 0;
        vec = vectors[a];
        coeff = coefficients[a];
        MW.util.checkNumber(coeff);
        MW.util.checkVectors(vectors[a-1], vec);
        if (global.unrollLoops) {
            for (i = lb.ifrom; i < ni3; ++i) {
                x[offset++] += coeff * vec.array[i];
                x[offset++] += coeff * vec.array[i+1];
                x[offset++] += coeff * vec.array[i+2];
                x[offset++] += coeff * vec.array[i+3];
            }
            for (; i < lb.ito; ++i) {
                x[offset++] += coeff * vec.array[i];
            }
        } else {
            for (i = lb.ifrom; i < lb.ito; ++i) {
                x[offset++] += coeff * vec.array[i];
            }
        }
    }

    MW.MathWorker.gatherVector(x, vec.length, lb.ifrom, tag, rebroadcast);
};

MW.BatchOperation.wkMatrixLinearCombination = function(matrices, coefficients, tag, rebroadcast) {
    MW.util.checkNumber(coefficients[0]);
    MW.util.checkMatrix(matrices[0]);
    MW.util.checkNullOrUndefined(tag);

    // First combo initializes M
    var M = [];
    var offset = 0;
    var mat = matrices[0];
    var coeff = coefficients[0];
    var lb = MW.util.loadBalance(matrices[0].nrows);
    for (var i = lb.ifrom; i < lb.ito; ++i) {
        M.push(new Float64Array(mat.ncols));
        for (var j = 0; j < mat.ncols; ++j) {
            M[offset][j] = coeff * mat.array[i][j];
        }
        ++offset;
    }

    // Remaining combos
    for (var a = 1; a < matrices.length; ++a) {
        offset = 0;
        mat = matrices[a];
        coeff = coefficients[a];
        MW.util.checkNumber(coeff);
        MW.util.checkMatrices(matrices[a-1], mat);
        for (i = lb.ifrom; i < lb.ito; ++i) {
            for (j = 0; j < mat.ncols; ++j) {
                M[offset][j] += coeff * mat.array[i][j]
            }
            ++offset;
        }
    }

    MW.MathWorker.gatherMatrixRows(M, mat.nrows, lb.ifrom, tag, rebroadcast);
};

// z <- alpha * A.x + beta * y
MW.BatchOperation.wkMatrixVectorPlus = function(alpha, A, x, tag, rebroadcast, beta, y) {
    MW.util.checkNumber(alpha);
    MW.util.checkMatrixVector(A, x);
    MW.util.checkNullOrUndefined(tag);

    var lb = MW.util.loadBalance(A.nrows);
    var z = new Float64Array(lb.ito - lb.ifrom);
    var offset = 0;
    if (beta && y) {
        MW.util.checkNumber(beta);
        MW.util.checkVectors(x, y);
        for (var i = lb.ifrom; i < lb.ito; ++i) {
            var tot = 0.0;
            for (var j = 0; j < this.ncols; ++j) {
                tot += A.array[i][j] * v.array[j];
            }
            z[offset++] = alpha * tot + beta * y[i];
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            tot = 0.0;
            for (j = 0; j < this.ncols; ++j) {
                tot += A.array[i][j] * v.array[j];
            }
            z[offset++] = alpha * tot;
        }
    }
    MW.MathWorker.gatherVector(z, x.length, lb.ifrom, tag, rebroadcast);
};


// D = alpha * A.B + beta * C
MW.BatchOperation.wkMatrixMatrixPlus = function(alpha, A, B, tag, rebroadcast, beta, C) {
    MW.util.checkNumber(alpha);
    MW.util.checkMatrixMatrix(A, B);
    MW.util.checkNullOrUndefined(tag);

    // Transpose B for better row-major memory access
    // If square, save on memory by doing an in-place transpose
    var Bt = B.isSquare() ? B.transposeInPlace() : B.transpose();
    var lb = MW.util.loadBalance(A.nrows);
    var D = [];
    var offset = 0;

    if (beta && C) {
        MW.util.checkNumber(beta);
        MW.util.checkMatrix(C);
        if (!(A.nrows === C.nrows && B.ncols === C.ncols)) {
            throw new Error("Matrix dimensions not compatible for addition.");
        }

        for (var i = lb.ifrom; i < lb.ito; ++i) {
            D.push(new Float64Array(B.ncols));
            for (var j = 0; j < B.ncols; ++j) {
                var tot = 0.0;
                for (var k = 0; k < A.ncols; ++k) {
                    tot += A.array[i][k] * Bt.array[j][k];
                }
                D[offset][j] = alpha * tot + beta * C.array[i][j];
            }
            ++offset;
        }
    } else {
        for (i = lb.ifrom; i < lb.ito; ++i) {
            D.push(new Float64Array(B.ncols));
            for (j = 0; j < B.ncols; ++j) {
                tot = 0.0;
                for (k = 0; k < A.ncols; ++k) {
                    tot += A.array[i][k] * Bt.array[j][k];
                }
                D[offset][j] = alpha * tot;
            }
            ++offset;
        }
    }

    // restore B
    if (B.isSquare) {
        B.transposeInPlace();
    }

    MW.MathWorker.gatherMatrixRows(D, A.nrows, lb.ifrom, tag, rebroadcast);
};

// Copyright 2014 Adrian W. Lange

/**
 * A few simple statistics functions
 */
MW.stats = {};

/**
 * Compute basic summary statistics for a generic Array, Float64Array, Vector, or Matrix
 *
 * Returns an object containing number of elements, mean, standard deviation,
 * minimum, maximum, and quartiles. The quartiles computed here are the so-called
 * "Tukey's Hinges".
 *
 * Quartiles are not reported if the data passed in contains less than 3 elements
 */
MW.stats.summary = function(data) {
    MW.util.checkNullOrUndefined(data);
    // Copy the data to a local array so that we can sort without affecting data
    var i;
    var arr = [];
    if (data instanceof MW.Vector) {
        for (i = 0; i < data.array.length; ++i) {
            arr.push(data.array[i]);
        }
    } else if (data instanceof MW.Matrix) {
        for (i = 0; i < data.nrows; ++i) {
            for (var j = 0; j < data.ncols; ++j) {
                arr.push(data.array[i][j]);
            }
        }
    } else if (data instanceof Array || data instanceof Float64Array) {
        for (i = 0; i < data.length; ++i) {
            arr.push(data[i]);
        }
    } else {
        throw new TypeError("Invalid data type for summary(). Must be Array, Float64Array, or Vector.");
    }

    var tmp;
    var n = arr.length;
    var tot = 0.0;
    var amax = Math.max.apply(Math, arr);
    var amin = Math.min.apply(Math, arr);
    for (i = 0; i < n; ++i) {
        tot += arr[i];
    }
    var mean = tot / n;
    var variance = 0.0;
    for (i = 0; i < n; ++i) {
        tmp = mean - arr[i];
        variance += tmp * tmp;
    }
    variance /= n;
    var stddev = Math.sqrt(variance);

    var q25, q50, q75;
    if (n >= 3) {
        // Sort for quartiles
        arr.sort(function(a, b){return a-b});

        var x, y;
        x = getMedian(0, n-1);
        q50 = x.median;
        y = getMedian(x.half, n-1);
        q75 = y.median;
        if (x.odd) {
            y = getMedian(0, x.half);
            q25 = y.median;
        } else {
            y = getMedian(0, x.half-1);
            q25 = y.median;
        }
    }

    function getMedian(nfrom, nto) {
        var m = nto - nfrom + 1;
        var half = (m/2)|0;
        var odd = (m % 2);
        var median = odd ? arr[nfrom + half] : 0.5 * (arr[nfrom + half-1] + arr[nfrom + half]);
        return {median: median, half: half, odd: odd};
    }

    return {
        n: arr.length,
        mean: mean,
        variance: variance,
        stddev: stddev,
        minimum: amin,
        maximum: amax,
        quartile25: q25,
        quartile50: q50,
        quartile75: q75
    };
};


return MW;
}());