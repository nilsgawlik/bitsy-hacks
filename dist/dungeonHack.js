/**
↔
@file dungeonHack
@summary dungeon stuff
@license MIT
@version 1.1.1
@requires 5.3
@author Nils Gawlik

@description
sdaf fdfa
*/
this.hacks = this.hacks || {};
this.hacks.dungeonHack = (function (exports,bitsy) {
'use strict';
var hackOptions = {
};

bitsy = bitsy && bitsy.hasOwnProperty('default') ? bitsy['default'] : bitsy;

/**
@file utils
@summary miscellaneous bitsy utilities
@author Sean S. LeBlanc
*/

/*
Helper used to replace code in a script tag based on a search regex
To inject code without erasing original string, using capturing groups; e.g.
	inject(/(some string)/,'injected before $1 injected after')
*/
function inject(searchRegex, replaceString) {
	// find the relevant script tag
	var scriptTags = document.getElementsByTagName('script');
	var scriptTag;
	var code;
	for (var i = 0; i < scriptTags.length; ++i) {
		scriptTag = scriptTags[i];
		var matchesSearch = scriptTag.textContent.search(searchRegex) !== -1;
		var isCurrentScript = scriptTag === document.currentScript;
		if (matchesSearch && !isCurrentScript) {
			code = scriptTag.textContent;
			break;
		}
	}

	// error-handling
	if (!code) {
		throw 'Couldn\'t find "' + searchRegex + '" in script tags';
	}

	// modify the content
	code = code.replace(searchRegex, replaceString);

	// replace the old script tag with a new one using our modified code
	var newScriptTag = document.createElement('script');
	newScriptTag.textContent = code;
	scriptTag.insertAdjacentElement('afterend', newScriptTag);
	scriptTag.remove();
}

/**
 * Helper for getting an array with unique elements 
 * @param  {Array} array Original array
 * @return {Array}       Copy of array, excluding duplicates
 */
function unique(array) {
	return array.filter(function (item, idx) {
		return array.indexOf(item) === idx;
	});
}

/**

@file kitsy-script-toolkit
@summary makes it easier and cleaner to run code before and after Bitsy functions or to inject new code into Bitsy script tags
@license WTFPL (do WTF you want)
@version 3.4.0
@requires Bitsy Version: 4.5, 4.6
@author @mildmojo

@description
HOW TO USE:
  import {before, after, inject, addDialogTag, addDeferredDialogTag} from "./helpers/kitsy-script-toolkit";

  before(targetFuncName, beforeFn);
  after(targetFuncName, afterFn);
  inject(searchRegex, replaceString);
  addDialogTag(tagName, dialogFn);
  addDeferredDialogTag(tagName, dialogFn);

  For more info, see the documentation at:
  https://github.com/seleb/bitsy-hacks/wiki/Coding-with-kitsy
*/


// Ex: inject(/(names.sprite.set\( name, id \);)/, '$1console.dir(names)');
function inject$1(searchRegex, replaceString) {
	var kitsy = kitsyInit();
	kitsy.queuedInjectScripts.push({
		searchRegex: searchRegex,
		replaceString: replaceString
	});
}

// Ex: after('load_game', function run() { alert('Loaded!'); });
function after(targetFuncName, afterFn) {
	var kitsy = kitsyInit();
	kitsy.queuedAfterScripts[targetFuncName] = kitsy.queuedAfterScripts[targetFuncName] || [];
	kitsy.queuedAfterScripts[targetFuncName].push(afterFn);
}

function kitsyInit() {
	// return already-initialized kitsy
	if (bitsy.kitsy) {
		return bitsy.kitsy;
	}

	// Initialize kitsy
	bitsy.kitsy = {
		queuedInjectScripts: [],
		queuedBeforeScripts: {},
		queuedAfterScripts: {}
	};

	var oldStartFunc = bitsy.startExportedGame;
	bitsy.startExportedGame = function doAllInjections() {
		// Only do this once.
		bitsy.startExportedGame = oldStartFunc;

		// Rewrite scripts and hook everything up.
		doInjects();
		applyAllHooks();

		// Start the game
		bitsy.startExportedGame.apply(this, arguments);
	};

	return bitsy.kitsy;
}


function doInjects() {
	bitsy.kitsy.queuedInjectScripts.forEach(function (injectScript) {
		inject(injectScript.searchRegex, injectScript.replaceString);
	});
	_reinitEngine();
}

function applyAllHooks() {
	var allHooks = unique(Object.keys(bitsy.kitsy.queuedBeforeScripts).concat(Object.keys(bitsy.kitsy.queuedAfterScripts)));
	allHooks.forEach(applyHook);
}

function applyHook(functionName) {
	var functionNameSegments = functionName.split('.');
	var obj = bitsy;
	while (functionNameSegments.length > 1) {
		obj = obj[functionNameSegments.shift()];
	}
	var lastSegment = functionNameSegments[0];
	var superFn = obj[lastSegment];
	var superFnLength = superFn ? superFn.length : 0;
	var functions = [];
	// start with befores
	functions = functions.concat(bitsy.kitsy.queuedBeforeScripts[functionName] || []);
	// then original
	if (superFn) {
		functions.push(superFn);
	}
	// then afters
	functions = functions.concat(bitsy.kitsy.queuedAfterScripts[functionName] || []);

	// overwrite original with one which will call each in order
	obj[lastSegment] = function () {
		var args = [].slice.call(arguments);
		var i = 0;
		runBefore.apply(this, arguments);

		// Iterate thru sync & async functions. Run each, finally run original.
		function runBefore() {
			// All outta functions? Finish
			if (i === functions.length) {
				return;
			}

			// Update args if provided.
			if (arguments.length > 0) {
				args = [].slice.call(arguments);
			}

			if (functions[i].length > superFnLength) {
				// Assume funcs that accept more args than the original are
				// async and accept a callback as an additional argument.
				functions[i++].apply(this, args.concat(runBefore.bind(this)));
			} else {
				// run synchronously
				var newArgs = functions[i++].apply(this, args);
				newArgs = newArgs && newArgs.length ? newArgs : args;
				runBefore.apply(this, newArgs);
			}
		}
	};
}

function _reinitEngine() {
	// recreate the script and dialog objects so that they'll be
	// referencing the code with injections instead of the original
	bitsy.scriptModule = new bitsy.Script();
	bitsy.scriptInterpreter = bitsy.scriptModule.CreateInterpreter();

	bitsy.dialogModule = new bitsy.Dialog();
	bitsy.dialogRenderer = bitsy.dialogModule.CreateRenderer();
	bitsy.dialogBuffer = bitsy.dialogModule.CreateBuffer();
}





var dungeon = {
    map: [],
    curPos: {x: 0, y: 0},
    prevRoom: -7,
};

// room tiles
var specialTiles = {
    room: null,
    stairs: null,
    boss: null,
    empty: "0",
};

after("load_game", function() {

    Object.keys(tile).forEach(function(key,index) {
        let t = tile[key];

        if(t.name) {
            if(t.name == "mapRoom") {
                specialTiles.room = t.id;
            } else if(t.name == "mapStairs") {
                specialTiles.stairs = t.id;
            } else if(t.name == "mapBoss") {
                specialTiles.boss = t.id;
            }
        }
    });


    
});

inject$1(/curRoom \= ext.dest.room;/g, "curRoom = ext.dest.room;\nwindow.onRoomChange();");
window.onRoomChange = function() {
    generateDungeonMap();
};

function generateDungeonMap() {
    console.log("GENERATING DUNGEON...");

    // generate empty world map
    let w = 14;
    let h = 7;
    let inside = (x, y) => (x >= 0 && x < w && y >= 0 && y < h);

    dungeon.map = new Array(h);
    for(let x = 0; x < w; x++) {
        dungeon.map[x] = new Array(h);
        for(let y = 0; y < h; y++) {
            dungeon.map[x][y] = specialTiles.empty;
        }
    }

    // populate internal world map with path
    let curPos = {x: 7, y: 3};
    let steps = 33;
    dungeon.map[curPos.x][curPos.y] = specialTiles.stairs;
    for(let i = 0; i < steps; i++) {
        // generator performs a random step
        let prevPos = {x: curPos.x, y: curPos.y};
        let d = Math.floor(Math.random() * 4) * Math.PI * 0.5;
        let interPos = {
            x: curPos.x + Math.round(Math.cos(d)),
            y: curPos.y + Math.round(Math.sin(d)),
        };
        curPos.x = curPos.x + Math.round(Math.cos(d) * 2);
        curPos.y = curPos.y + Math.round(Math.sin(d) * 2);

        // check for collision
        if(!inside(curPos.x, curPos.y) || dungeon.map[curPos.x][curPos.y] != specialTiles.empty) {
            curPos = prevPos;
        } else {
            // build path
            dungeon.map[interPos.x][interPos.y] = specialTiles.room;
            dungeon.map[curPos.x][curPos.y] = specialTiles.room;
        }

        // check if last step, place boss room
        if(i == steps - 1) {
            dungeon.map[curPos.x][curPos.y] = specialTiles.boss;
        }
    }

    // "render" world map to the room
    let tilemap = room[curRoom].tilemap;
    let mapOrigin = {x: 1, y: 8};

    for(let x = 0; x < w; x++) 
    for(let y = 0; y < h; y++) {
        // y,x order not x,y !!!
        tilemap[mapOrigin.y + y][mapOrigin.x + x] = dungeon.map[x][y];
    }
}

exports.hackOptions = hackOptions;

return exports;

}({},window));
