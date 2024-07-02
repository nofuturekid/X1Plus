.pragma library
.import DdsListener 1.0 as JSDdsListener
.import X1PlusNative 1.0 as JSX1PlusNative
.import "Binding.js" as Binding


/* Exposes print-related QML properties and signals to DBus
** 
*/

var X1Plus = null;

var _DdsListener = JSDdsListener.DdsListener;
var _X1PlusNative = JSX1PlusNative.X1PlusNative;

const PRINT_STATE = {
    IDLE: 0,
    SLICING: 1,
    PAUSED: 2,
    RUNNING: 3,    
    FINISH: 4,
    FAILED: 5
};

var [printState, printStateChanged, _setPrintState] = Binding.makeBinding(-1);
var [layerNum, layerNumChanged, _setLayerNum] = Binding.makeBinding(-1);
var [totalLayerNum, totalLayerNumChanged, _setTotalLayerNum] = Binding.makeBinding(-1);

var isBusy = function() {
    switch (printState){
        case PRINT_STATE.IDLE, PRINT_STATE.FINISH, PRINT_STATE.FAILED:
            return false
            break
        case PRINT_STATE.SLICING, PRINT_STATE.PAUSED, PRINT_STATE.RUNNING:
            return true
            break
    }
}

function onLayerChanged(layer,totalLayer){
	_setLayerNum(layer);
	_setTotalLayerNum(totalLayer);
	console.log("[x1p] onLayerChanged: ", layer, totalLayer);
	layerUpdate(layer);
}

function onStateChanged(state){
	_setPrintState(state);
	console.log("[x1p] onStateChanged:  ", state);
	printStateUpdate(state);
}

var _PrintStateUpdate = null;
var _LayerUpdate = null;

function layerUpdate(a) {
    if (typeof _LayerUpdate === 'function') {
        _LayerUpdate({["layer"]: a});
    } else {
        console.error("_LayerUpdate is not a function");
    }
}

function printStateUpdate(a) {
    if (typeof _PrintStateUpdate === 'function') {
        _PrintStateUpdate({["state"]: a});
    } else {
        console.error("_PrintStateUpdate is not a function");
    }
}

/* Signal from x1plusd to bbl_screen requesting calibration procedure start */
function calibrationSignal(){
    /* Signal that allows x1plusd to run x1plus calibration features */   
    X1Plus.DBus.onSignal("x1plus.printer", "Calibration", (arg) => {
        if (isBusy()) return "Printer is current busy";
        if (arg.cal == "vibration") {
            console.log("Request from x1plusd to calibrate vibration compensation")
            X1Plus.ShaperCalibration.start(args.low, args.high);
            
        } else if (arg.cal == "mesh") {
            console.log("Request from x1plusd to calibrate bed mesh")
            X1Plus.BedMeshCalibration.start();
        } 
    });    
}

/* Signal from x1plusd to bbl_screen requesting print config change */
function printConfigSignal(){
    X1Plus.DBus.onSignal("x1plus.printer", "PrintConfig", (arg) => {
        let action = arg.topic;
        if (action == "set"){
            setPrintConfig(arg.key, arg.val);
            return "success";
        } else {
            return getPrintConfig();
        }
    });
}

function awaken(){
    if (!X1Plus || !X1Plus.DBus) {
        console.error("X1Plus or X1Plus.DBus is not initialized");
        return;
    }
    _LayerUpdate = X1Plus.DBus.proxyFunction("x1plus.x1plusd", "/x1plus/printer", "x1plus.printer", "Layer");
	_PrintStateUpdate = X1Plus.DBus.proxyFunction("x1plus.x1plusd", "/x1plus/printer", "x1plus.printer", "State");
    calibrationSignal();
    printConfigSignal();
}


