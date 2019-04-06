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
	after
} from "./helpers/kitsy-script-toolkit";

export var hackOptions = {
};

console.log("Dungeon hack is active!")

var dungeon = {
    map: [],
    curPos: {x: 0, y: 0},
    prevRoom: 0,
}

before("load_game", function() {
    let w = 14;
    let h = 6;
    for(var x = 0; x < w; x++)
    for(var y = 0; y < h; y++) {
        dungeon.map[x][y] = Math.random() < 0.5? "R" : ".";
    }
});

after("load_game", function() {
    dungeon.prevRoom = curRoom;
});

before("update", function() {

});