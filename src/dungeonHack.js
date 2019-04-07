/**
↔
@file dungeonHack
@summary dungeon stuff
@license MIT
@version 1.0.0
@requires 5.3
@author Nils Gawlik

@description
sdaf fdfa
*/

import bitsy from "bitsy";
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
    },
};

var dungeon = {
    map: [],
    curPos: {x: 0, y: 0},
    prevRoom: -7,
}

// room tile ids (will be populated after game load)
var tileIDs = {
    room: null,
    stairs: null,
    boss: null,
    empty: "0",
}

after("load_game", function() {
    // iterate through the tiles to find the map tiles
    // specified in the hack options
    Object.keys(tile).forEach(function(key,index) {
        let t = tile[key];

        if(t.name) {
            if(t.name == hackOptions.mapTileNames.room) {
                tileIDs.room = t.id;
            } else if(t.name == hackOptions.mapTileNames.stairs) {
                tileIDs.stairs = t.id;
            } else if(t.name == hackOptions.mapTileNames.boss) {
                tileIDs.boss = t.id;
            }
        }
    });
});

inject(/curRoom \= ext.dest.room;/g, "curRoom = ext.dest.room;\nwindow.onRoomChange();")
window.onRoomChange = function() {
    generateDungeonMap();
}

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
            dungeon.map[x][y] = tileIDs.empty;
        }
    }

    // populate internal world map with path
    let curPos = {x: 7, y: 3};
    let steps = 33;
    dungeon.map[curPos.x][curPos.y] = tileIDs.stairs;
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
        if(!inside(curPos.x, curPos.y) || dungeon.map[curPos.x][curPos.y] != tileIDs.empty) {
            curPos = prevPos;
        } else {
            // build path
            dungeon.map[interPos.x][interPos.y] = tileIDs.room;
            dungeon.map[curPos.x][curPos.y] = tileIDs.room;
        }

        // check if last step, place boss room
        if(i == steps - 1) {
            dungeon.map[curPos.x][curPos.y] = tileIDs.boss;
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