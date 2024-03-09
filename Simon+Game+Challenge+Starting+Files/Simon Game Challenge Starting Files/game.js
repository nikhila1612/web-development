// Array of button colours
var buttonColours = ["red", "blue", "green", "yellow"];

// Arrays to store game pattern and user clicked pattern
var gamePattern = [];
var userClickedPattern = [];

// Variables to track game status
var started = false;
var level = 0;

// Event listener for keydown event
$(document).keydown(function () {
    // If game hasn't started yet
    if (!started) {
        // Update heading text with current level
        $("h1").text("Level " + level);
        // Start the game
        nextSequence();
        // Set started flag to true
        started = true;
    }
});

// Event listener for button click
$(".btn").click(function () {
    // Get the id of the clicked button
    var userChosenColour = $(this).attr("id");
    // Add the clicked colour to userClickedPattern array
    userClickedPattern.push(userChosenColour);
    // Animate and play sound for the clicked button
    animatePress(userChosenColour);
    playSound(userChosenColour);
    // Check the user's answer
    checkAnswer(userClickedPattern.length - 1);
});

// Function to check user's answer
function checkAnswer(currentLevel) {
    // If the current user input matches the game pattern
    if (gamePattern[currentLevel] === userClickedPattern[currentLevel]) {
        // Log success
        console.log("success");
        // If user has completed the current sequence
        if (userClickedPattern.length === gamePattern.length) {
            // Wait for 1 second then start the next sequence
            setTimeout(function () {
                nextSequence();
            }, 1000);
        }
    } else {
        // Log wrong answer
        console.log("wrong");
        // Play wrong sound
        var audio = new Audio("sounds/wrong.mp3");
        audio.play();
        // Flash screen and show "Game Over" message
        $("body").addClass("game-over");
        setTimeout(function(){
            $("body").removeClass("game-over");
        },200);
        $("h1").text("Game Over, Press Any Key to Restart.");
        // Reset game
        startOver();
    }
}

// Function to generate the next sequence
function nextSequence() {
    // Clear the user's clicked pattern
    userClickedPattern = [];
    // Increase the level
    level++;
    // Update heading text with current level
    $("h1").text("Level " + level);
    // Generate a random number between 0 and 3
    var randomNumber = Math.floor(Math.random() * 4);
    // Choose a random colour from the buttonColours array
    var randomChosenColour = buttonColours[randomNumber];
    // Add the chosen colour to the game pattern array
    gamePattern.push(randomChosenColour);
    // Fade in and out the button corresponding to the chosen colour
    $("#" + randomChosenColour).fadeIn(100).fadeOut(100).fadeIn(100);
    // Play sound for the chosen colour
    playSound(randomChosenColour);
}

// Function to play sound for a given colour
function playSound(name) {
    // Create an Audio object with the corresponding sound file
    var audio = new Audio("sounds/" + name + ".mp3");
    // Play the audio
    audio.play();
}

// Function to animate button press
function animatePress(currentColour) {
    // Add the "pressed" class to the button
    $("#" + currentColour).addClass('pressed');
    // Remove the "pressed" class after 100 milliseconds
    setTimeout(function () {
        $("#" + currentColour).removeClass("pressed");
    }, 100);
}

// Function to reset game state
function startOver(){
   level=0;
   gamePattern=[];
   started= false;
}
