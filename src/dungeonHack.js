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

import bitsy from "bitsy";
import {
    before,
	after,
    inject
} from "./helpers/kitsy-script-toolkit";

export var hackOptions = {
};

var dungeon = {
    map: [],
    curPos: {x: 0, y: 0},
    prevRoom: -7,
}

// room tiles
var specialTiles = {
    room: null,
    stairs: null,
    boss: null,
    empty: "0",
}

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