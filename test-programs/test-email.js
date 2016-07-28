var nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
//note, this needs: https://support.google.com/accounts/answer/6010255?hl=en
var transporter = nodemailer.createTransport('smtps://username%40gmail.com:password@smtp.gmail.com');

// setup e-mail data with unicode symbols
var mailOptions = {
    from: '"Dejan Pangercic" <dejanpan001@gmail.com>',
    to: 'dejan.pangercic@gmail.com',
    subject: 'Hello', // Subject line 
    text: 'Hello world'
};

// send mail with defined transport object
transporter.sendMail(mailOptions, function(error, info){
    if(error){
	return console.log(error);
    }
    console.log('Message sent: ' + info.response);
});
 
