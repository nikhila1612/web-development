var numberofdrums =document.querySelectorAll(".drum").length

for(var i=0; i<numberofdrums;i++){
    document.querySelectorAll(".drum")[i].addEventListener("click",handleClick);

}
// For button element
function handleClick(){
   var buttonText = this.innerHTML;
   makeSound(buttonText);
   buttonAnimation(buttonText);
   
} 

// For keyboard element
document.addEventListener("keydown",function(event){

    makeSound(event.key);
    buttonAnimation(event.key);
});

function makeSound(key){
    switch (key){
        case "w":
            console.log("Playing sound: ton-1");
            var tom1 = new Audio("sounds/tom-1.mp3");
            tom1.play();
            break;
        
        case "a":
            console.log("Playing sound: ton-2");
            var tom2 = new Audio("sounds/tom-2.mp3");
            tom2.play();
            break;
    
        case "s":
            console.log("Playing sound: ton-3");
            var tom3 = new Audio("sounds/tom-3.mp3");
            tom3.play();
            break;
        case "d":
            console.log("Playing sound: ton-4");
            var tom4 = new Audio("sounds/tom-4.mp3");
            tom4.play();
            break;
        case "j":
            console.log("Playing sound: crash");
            var crash = new Audio("sounds/crash.mp3");
            crash.play();
            break;
        case "k":
            console.log("Playing sound: kick");
            var kick = new Audio("sounds/kick-bass.mp3");
            kick.play();
            break;
        case "l":
            console.log("Playing sound: snare");
            var snare = new Audio("sounds/snare.mp3");
            snare.play();
            break;
    
        default: console.log("Unknown button:" + buttonText);
       }
}

// Animation occurs when a button or the specific key is pressed.
function buttonAnimation(currentkey){
    var currentButton=document.querySelector("." + currentkey);

    currentButton.classList.add("pressed");
    setTimeout(function(){
        currentButton.classList.remove("pressed");

    },250);
}