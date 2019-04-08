/**
⬜
@file move-sprite-from-dialog
@summary Moves a sprite from dialog
@license MIT
@version 1.0.0
@requires 5.3
@author Nils Gawlik

@description
sdaf fdfa
*/

import {
    addDeferredDialogTag
} from "./helpers/kitsy-script-toolkit";

export var hackOptions = {
    
};

addDeferredDialogTag("move", function(environment, parameters) {
    let params = parameters[0].split(" ");
    let spriteId = params[0];
    let deltaX = Number(params[1]);
    let deltaY = Number(params[2]);

    // safety checks
    if(isNaN(deltaX) || isNaN(deltaY) || !names.sprite.has(spriteId)) {
        console.log("move-sprite: could not parse move command!")
        console.log(params);
        console.log(parameters);
        return;
    }
    
    console.log("move-sprite: move sprite...")

    // convert to actual id from name
    spriteId = names.sprite.get(spriteId); 

    // move sprite
    sprite[spriteId].x += deltaX;
    sprite[spriteId].y += deltaY;

    // clamp to level bounds
    sprite[spriteId].x = Math.min(Math.max(sprite[spriteId].x, 0), 15);
    sprite[spriteId].y = Math.min(Math.max(sprite[spriteId].y, 0), 15);
});