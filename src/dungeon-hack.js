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

import {
    before,
	after,
    inject
} from "./helpers/kitsy-script-toolkit";

export var hackOptions = {
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

var dungeon = {
    map: [],
    curPos: {x: 0, y: 0},
}

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
}
var itemIDs = {
    cursor: null,
}

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
inject(/curRoom \= ext.dest.room;/g, "curRoom = ext.dest.room;\nwindow.onRoomChange();")
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