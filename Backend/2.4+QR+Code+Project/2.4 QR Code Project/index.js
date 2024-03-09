// Import necessary modules
import inquirer from 'inquirer';
import qr from 'qr-image';
import fs from 'fs';

// Prompt the user to input their URL
inquirer
  .prompt([{
    message:"Type in your URL:", // Prompt message
    name:"URL" // Name of the input field
}])
  .then((answers) => {
    // Retrieve the URL from the user's input
    const url = answers.URL;
    
    // Generate QR code image based on the URL
    var qr_svg = qr.image(url);
    
    // Save the QR code image to a file
    qr_svg.pipe(fs.createWriteStream('qr-image.png'));
    
    // Save the URL to a text file
    fs.writeFile('url.txt', url, (err) => {
        if (err) throw err; // Throw an error if encountered
        console.log('The file has been saved!'); // Log success message
      }); 

})
  .catch((error) => {
    if (error.isTtyError) {
      // Handle error if prompt couldn't be rendered in the current environment
    } else {
      // Handle other errors
    }
  });
