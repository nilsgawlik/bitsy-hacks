/**
⬜
@file dungeon-hack
@summary dungeon stuff
@license MIT
@version 1.0.0
@requires 5.3
@author Nils Gawlik

@description
sdaf fdfa
*/
this.hacks = this.hacks || {};
this.hacks['dungeon-hack'] = (function (exports,bitsy) {
'use strict';
var hackOptions = {
    mapArea: {
        x: 1,
        y: 8,
        w: 14,
        h: 7,
    },
    mapTileNames: {
        room: "mapRoom",
        boss: "mapBoss",
        stairs: "mapStairs",
        doorN: "doorN",
        doorS: "doorS",
        doorW: "doorW",
        doorE: "doorE",
        wall: "roomWall",
    },
    mapItemNames: {
        cursor: "mapCursor",
    },
    roomExits: [
        {x: 3, y: 1, tileName: "doorN", delta: {x: 0, y: -1}},
        {x: 3, y: 5, tileName: "doorS", delta: {x: 0, y: 1}},
        {x: 1, y: 3, tileName: "doorW", delta: {x: -1, y: 0}},
        {x: 5, y: 3, tileName: "doorE", delta: {x: 1, y: 0}},
    ],
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

// Ex: before('load_game', function run() { alert('Loading!'); });
//     before('show_text', function run(text) { return text.toUpperCase(); });
//     before('show_text', function run(text, done) { done(text.toUpperCase()); });
function before(targetFuncName, beforeFn) {
	var kitsy = kitsyInit();
	kitsy.queuedBeforeScripts[targetFuncName] = kitsy.queuedBeforeScripts[targetFuncName] || [];
	kitsy.queuedBeforeScripts[targetFuncName].push(beforeFn);
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
};

var prevPlayerPos = {x: 0, y: 0};

// room tile ids (will be populated after game load)
var tileIDs = {
    empty: "0",
    room: null,
    stairs: null,
    boss: null,
    doorN: null,
    doorS: null,
    doorW: null,
    doorE: null,
    wall: null,
};
var itemIDs = {
    cursor: null,
};

after("load_game", function() {
    // iterate through the tiles to find the map tiles
    // specified in the hack options
    Object.keys(tile).forEach(function(key,index) {
        let t = tile[key];

        if(t.name) {
            // see if we find a tile name specified and if so add it to the tile IDs
            Object.keys(hackOptions.mapTileNames).forEach(function(key, index) {
                if(t.name == hackOptions.mapTileNames[key]) {
                    tileIDs[key] = t.id;
                }
            });
        }
    });

    // do the same for items
    Object.keys(item).forEach(function(key, index) {
        let itm = item[key];

        if(itm.name) {
            if(itm.name == hackOptions.mapItemNames.cursor) {
                itemIDs.cursor = itm.id;
            }
        }
    });

    // generate the dungeon
    generateDungeonMap();
});

before("update", function() {
    let plr = sprite[playerId];
    prevPlayerPos = {x: plr.x, y: plr.y};
});

// injection to get hook into room change
inject$1(/curRoom \= ext.dest.room;/g, "curRoom = ext.dest.room;\nwindow.onRoomChange();");
window.onRoomChange = onRoomChange;

function onRoomChange() {
    console.log("room change...");

    // figure out transition direction, move the map cursor
    let plr = sprite[playerId];
    let moveDir = {x: plr.x - prevPlayerPos.x, y: plr.y - prevPlayerPos.y};
    dungeon.curPos.x += -Math.sign(moveDir.x);
    dungeon.curPos.y += -Math.sign(moveDir.y);
    
    roomSetup();
}

function roomSetup() {
    // set cursor
    let cursor = room[curRoom].items.find((itm) => (itm.id == itemIDs.cursor));
    if (cursor) {
        cursor.x = dungeon.curPos.x + hackOptions.mapArea.x;
        cursor.y = dungeon.curPos.y + hackOptions.mapArea.y;
    }
    
    // set up doors
    let thisRoom = room[curRoom];
    let tilemap = thisRoom.tilemap;

    for (let roomExit of hackOptions.roomExits) {
        let targetRoomPos = {
            x: dungeon.curPos.x + roomExit.delta.x,
            y: dungeon.curPos.y + roomExit.delta.y,
        };

        if(
            insideDungeon(targetRoomPos.x, targetRoomPos.y) 
            && dungeon.map[targetRoomPos.x][targetRoomPos.y] != tileIDs.empty
        ) {
            // set door tile
            tilemap[roomExit.y][roomExit.x] = tileIDs[roomExit.tileName];
        } else {
            tilemap[roomExit.y][roomExit.x] = tileIDs.wall;
        }
    }
}

function generateDungeonMap() {
    console.log("GENERATING DUNGEON...");

    // generate empty world map
    let w = hackOptions.mapArea.w;
    let h = hackOptions.mapArea.h;

    dungeon.map = new Array(h);
    for(let x = 0; x < w; x++) {
        dungeon.map[x] = new Array(h);
        for(let y = 0; y < h; y++) {
            dungeon.map[x][y] = tileIDs.empty;
        }
    }

    // populate internal world map with path
    let crawler = {x: 7, y: 3};
    dungeon.curPos = {x: crawler.x, y: crawler.y};
    let steps = 33;
    dungeon.map[crawler.x][crawler.y] = tileIDs.stairs;
    for(let i = 0; i < steps; i++) {
        // generator performs a random step
        let prevPos = {x: crawler.x, y: crawler.y};
        let d = Math.floor(Math.random() * 4) * Math.PI * 0.5;
        let interPos = {
            x: crawler.x + Math.round(Math.cos(d)),
            y: crawler.y + Math.round(Math.sin(d)),
        };
        crawler.x = crawler.x + Math.round(Math.cos(d) * 2);
        crawler.y = crawler.y + Math.round(Math.sin(d) * 2);

        // check for collision
        if(!insideDungeon(crawler.x, crawler.y) || dungeon.map[crawler.x][crawler.y] != tileIDs.empty) {
            crawler = prevPos;
        } else {
            // build path
            dungeon.map[interPos.x][interPos.y] = tileIDs.room;
            dungeon.map[crawler.x][crawler.y] = tileIDs.room;
        }

        // check if last step, place boss room
        if(i == steps - 1) {
            dungeon.map[crawler.x][crawler.y] = tileIDs.boss;
        }
    }

    // "render" world map to the room
    let tilemap = room[curRoom].tilemap;

    for(let x = 0; x < w; x++) 
    for(let y = 0; y < h; y++) {
        // y,x order not x,y !!!
        tilemap[hackOptions.mapArea.y + y][hackOptions.mapArea.x + x] = dungeon.map[x][y];
    }

    // initial room setup
    roomSetup();
}

function insideDungeon(x, y) {
    return (x >= 0 && x < hackOptions.mapArea.w && y >= 0 && y < hackOptions.mapArea.h);
}

exports.hackOptions = hackOptions;

return exports;

}({},window));
