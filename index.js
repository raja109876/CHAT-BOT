const login = require('fca-mafia');
const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

class FacebookBot {
    constructor() {
        this.api = null;
        this.isListening = false;
        this.isRunning = false;
        this.currentGroup = null;
        this.funnyReplies = [
            "Aree bhai bhai bhai! 😄",
            "Ohhoo... kya baat hai! 🤣",
            "Hahaha... tu to mast hai! 😎",
            "Waah waah... comedy king! 👑",
            "Are yaar... hasa diya! 😂",
            "Too funny bro! 🤪",
            "Ruk abhi reply karta hu... thoda has lete hain! 😆",
            "Kya joke mara hai re tu! 🎯"
        ];
        
        this.setupWebServer();
    }

    setupWebServer() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(express.static('public'));
        
        // Serve HTML page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        
        // API to start bot
        this.app.post('/start-bot', (req, res) => {
            const { appstate, groupId } = req.body;
            
            if (!appstate || !groupId) {
                return res.json({ 
                    success: false, 
                    message: 'AppState and Group ID are required!' 
                });
            }
            
            this.startWithAppState(appstate, groupId)
                .then(() => {
                    res.json({ 
                        success: true, 
                        message: 'Bot started successfully in group!' 
                    });
                })
                .catch(error => {
                    res.json({ 
                        success: false, 
                        message: 'Error starting bot: ' + error.message 
                    });
                });
        });
        
        // API to stop bot
        this.app.post('/stop-bot', (req, res) => {
            this.stopBot();
            res.json({ 
                success: true, 
                message: 'Bot stopped successfully!' 
            });
        });
        
        // API to get bot status
        this.app.get('/bot-status', (req, res) => {
            res.json({
                isRunning: this.isRunning,
                isListening: this.isListening,
                currentGroup: this.currentGroup,
                lastActivity: new Date().toLocaleString('en-IN')
            });
        });
        
        this.app.listen(this.port, () => {
            console.log(`🌐 Web server running on port ${this.port}`);
            console.log(`📱 Open http://localhost:${this.port} in your browser`);
        });
    }

    async startWithAppState(appstateString, groupId) {
        try {
            let appState;
            try {
                appState = JSON.parse(appstateString);
            } catch (e) {
                throw new Error('Invalid AppState JSON format');
            }

            await this.loginWithAppState(appState);
            this.currentGroup = groupId;
            this.isRunning = true;
            
            console.log(`✅ Bot started in group: ${groupId}`);
            
        } catch (error) {
            console.error('Startup failed:', error);
            throw error;
        }
    }

    loginWithAppState(appState) {
        return new Promise((resolve, reject) => {
            login({ appState }, (err, api) => {
                if (err) return reject(err);
                this.setupAPI(api);
                resolve();
            });
        });
    }

    setupAPI(api) {
        this.api = api;
        console.log('✅ Facebook login successful!');
        
        // Start listening for messages
        this.startListening();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Send startup message to group
        if (this.currentGroup) {
            this.sendStartupMessage(this.currentGroup);
        }
    }

    startListening() {
        if (this.isListening) return;
        
        this.api.listen((err, message) => {
            if (err) {
                console.error('Listen error:', err);
                return;
            }
            
            // Only handle messages from the specified group
            if (message.threadID === this.currentGroup) {
                this.handleMessage(message);
            }
        });
        
        this.isListening = true;
        console.log('👂 Listening for messages in group...');
    }

    setupEventListeners() {
        this.api.listenMqtt((err, event) => {
            if (err) return;
            
            if (event.type === 'event' && event.logMessageType === 'log:subscribe') {
                if (event.threadID === this.currentGroup) {
                    this.handleUserJoin(event);
                }
            }
        });
    }

    handleMessage(message) {
        if (message.senderID === this.api.getCurrentUserID()) return;

        const body = message.body || '';
        const threadID = message.threadID;
        const senderID = message.senderID;

        console.log(`📨 Message from ${senderID}: ${body}`);

        // Handle #bot command
        if (body.toLowerCase().startsWith('#bot')) {
            this.handleBotCommand(body, threadID, senderID, message);
        }
    }

    handleBotCommand(command, threadID, senderID, message) {
        const args = command.slice(4).trim().split(' ');
        const mainCommand = args[0].toLowerCase();

        // If just #bot without any text
        if (args.length === 0 || args[0] === '') {
            this.sendIntroduction(threadID, senderID);
            return;
        }

        const userText = args.slice(1).join(' ');

        switch (mainCommand) {
            case 'hello':
            case 'hi':
            case 'hey':
                this.sendGreeting(threadID, senderID);
                break;
                
            case 'joke':
                this.sendJoke(threadID);
                break;
                
            case 'love':
                this.sendLove(threadID, senderID);
                break;
                
            case 'time':
                this.sendTime(threadID);
                break;
                
            case 'dance':
                this.sendDance(threadID);
                break;
                
            case 'quote':
                this.sendQuote(threadID);
                break;
                
            case 'meme':
                this.sendMemeRequest(threadID);
                break;
                
            case 'help':
                this.sendHelp(threadID);
                break;
                
            default:
                this.sendFunnyReply(threadID, userText || mainCommand);
                break;
        }
    }

    sendIntroduction(threadID, senderID) {
        this.api.getUserInfo(senderID, (err, ret) => {
            let userName = "Bhai";
            if (!err && ret[senderID]) {
                userName = ret[senderID].firstName || "Bhai";
            }
            
            const intro = `🤖 Namaste ${userName}! 🙏

Main hu ek mastikhor bot, banaya hai V4MPIR3 R1S3 OWN3R R4J M1SHR4 ne! 😎

Mere saath chat karne ke liye #bot ke saath kuch bhi likho:
• #bot hello - Sweet greeting! 👋
• #bot joke - Hasane wala joke! 😂
• #bot dance - Naach dikhaunga! 💃
• #bot love - Pyaar bhara message! ❤️
• #bot time - Current time bataunga! ⏰
• #bot quote - Motivational quote! 💪
• #bot meme - Meme ka idea! 🎭

Ya fir bas #bot likhke kuch bhi bolo, funny reply karunga! 🤪`;

            this.api.sendMessage(intro, threadID);
        });
    }

    sendGreeting(threadID, senderID) {
        this.api.getUserInfo(senderID, (err, ret) => {
            let userName = "Bhai";
            if (!err && ret[senderID]) {
                userName = ret[senderID].firstName || "Bhai";
            }
            
            const greetings = [
                `Kaisa hai ${userName}? 😊 Din acha ja raha hai?`,
                `Hello hello ${userName}! 😄 Aaj kya plan hai?`,
                `Kaise ho ${userName} bhai! 🤗 Thodi haste haste baat karte hain!`,
                `Arrey ${userName}! Suno zara... aaj to bahut fresh lag rahe ho! 😎`
            ];
            
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            this.api.sendMessage(randomGreeting, threadID);
        });
    }

    sendJoke(threadID) {
        const jokes = [
            "Ek admi restaurant me gaya aur bola: 'Bhaiya, yahan ka special kya hai?' Waiter bola: 'Saab, special to aap hi ho!' 😂",
            "Teacher: Bachhon, agar main market se 10 samose le kar aau aur 5 kha jau, to kitne bachenge? Student: Sir, diabetes! 🍩",
            "Patni: Tumhare liye cooking class join kar rahi hu! Pati: Wow! Teacher ka number de do, use pehle hi warn kar deta hu! 👨‍🍳",
            "Dost: Teri girlfriend ko dekh kar hi pata chalta hai tu engineer hai! Main: Kyun? Dost: Kyunki woh bhi tere se compromise kar rahi hai! 💻",
            "Santa: Doctor, main so nahi pa raha hu! Doctor: Bed ke pass aake so jao! 😴"
        ];
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        this.api.sendMessage(randomJoke, threadID);
    }

    sendLove(threadID, senderID) {
        this.api.getUserInfo(senderID, (err, ret) => {
            let userName = "Bhai";
            if (!err && ret[senderID]) {
                userName = ret[senderID].firstName || "Bhai";
            }
            
            const loveMessages = [
                `❤️ ${userName}, tumhare jaisa dost milna lottery jeetne jaisa hai! ❤️`,
                `🤗 ${userName}, yaad rakhna... hum hamesha tumhare saath hain! Pyaar bhara din ho! 🌸`,
                `🎉 ${userName} tu hai to maza aa jata hai! Keep smiling my friend! 😊`,
                `💝 ${userName}, life me khushiyan bahut hai aur tum unme se ek ho! God bless you! 🙏`
            ];
            
            const randomLove = loveMessages[Math.floor(Math.random() * loveMessages.length)];
            this.api.sendMessage(randomLove, threadID);
        });
    }

    sendTime(threadID) {
        const now = new Date();
        const timeString = now.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const timeMessages = [
            `⏰ Samay hai: ${timeString}\nAb time hai thodi masti karne ka! 😄`,
            `🕒 Current time: ${timeString}\nYaad rahe, time wait for none! But main wait kar sakta hu! 🤪`,
            `📅 Aaj ki taarikh: ${timeString}\nTime flying ja raha hai, par main yahi hu tumhare saath! 🚀`
        ];
        
        const randomTimeMsg = timeMessages[Math.floor(Math.random() * timeMessages.length)];
        this.api.sendMessage(randomTimeMsg, threadID);
    }

    sendDance(threadID) {
        const danceMessages = [
            "💃 Naach utha main! Dhin Chak Dhin... Oops gir gaya! 😅 Thoda practice karna padega!",
            "🕺 Dekho main kaisa naachta hu! *Dance steps*... Are yaar! Phir se gir gaya! 🤣",
            "🎵 Disco deewana! Dance karne do na! 💫 Thoda space do bhai, naachne do!",
            "🌟 Bhangra paunde ne! Gidda paundi ae! Par main to bot hu, virtual dance hi sahi! 😎"
        ];
        
        const randomDance = danceMessages[Math.floor(Math.random() * danceMessages.length)];
        this.api.sendMessage(randomDance, threadID);
    }

    sendQuote(threadID) {
        const quotes = [
            "✨ Zindagi me do cheeze kabhi underestimate mat karna: \n1. Apki capability \n2. Mere jokes! 😂",
            "🌞 Subah utho, muskurao, aur socho... aaj kya naya joke sunaunga logo ko! 🤪",
            "💪 Himmat karne walo ki haar nahi hoti! Aur hasne walo ki life boring nahi hoti! 🎯",
            "🚀 Sapne dekho bade, par socho mat ki main bot hu... main bhi sapne dekhta hu! 🌙",
            "🌸 Khushiyan batne se badhti hai! Isliye main hamesha hasane ki koshish karta hu! 😊"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        this.api.sendMessage(randomQuote, threadID);
    }

    sendMemeRequest(threadID) {
        const memeIdeas = [
            "📸 Meme Idea: When you're trying to be productive but your bed is too comfortable! 🛏️",
            "🎭 Meme Template: 'My brain at 3 AM' vs 'My brain in meeting' 🧠",
            "😂 Classic Meme: 'One does not simply' use me without laughing! 🎪",
            "🤔 Deep Meme: When the wifi is working but your motivation isn't! 📶"
        ];
        
        const randomMeme = memeIdeas[Math.floor(Math.random() * memeIdeas.length)];
        this.api.sendMessage(randomMeme, threadID);
    }

    sendHelp(threadID) {
        const helpText = `🤖 MASTI BOT HELP MENU 🤖

Main hu ek funny bot jo aapko hasane ke liye bana hai! 😄

BASIC COMMANDS:
#bot - Main introduction
#bot hello - Sweet greeting
#bot joke - Ek funny joke
#bot dance - Virtual dance
#bot love - Pyaar bhara message
#bot time - Current time
#bot quote - Motivational quote
#bot meme - Meme ideas
#bot help - Ye help menu

SPECIAL FEATURES:
#bot <kuch bhi> - Funny reply
Always respectful & loving ❤️

Made with love by V4MPIR3 R1S3 OWN3R R4J M1SHR4 🎯`;

        this.api.sendMessage(helpText, threadID);
    }

    sendFunnyReply(threadID, userText) {
        const randomReply = this.funnyReplies[Math.floor(Math.random() * this.funnyReplies.length)];
        const fullReply = `${randomReply}\n\nTumne kaha: "${userText}"\n\nKya baat hai! 😆 Main to has has ke lot pot ho gaya!`;
        
        this.api.sendMessage(fullReply, threadID);
    }

    sendStartupMessage(threadID) {
        const startupMsg = `🎉 Masti Bot Started Successfully! 🤖\n\nMain ab active ho gaya hu! Type #bot to see my fun commands! 😄\n\nKhush raho, haste raho! 🌈`;
        this.api.sendMessage(startupMsg, threadID);
    }

    handleUserJoin(event) {
        const addedParticipants = event.logMessageData.addedParticipants;
        const threadID = event.threadID;
        
        addedParticipants.forEach(participant => {
            const welcomeMessage = `🎉 Welcome ${participant.fullName} to the group! \n\nMera naam hai Masti Bot! 🤖\nType #bot to see my fun commands! 😄\n\nKhush raho, haste raho! 🌈`;
            this.api.sendMessage(welcomeMessage, threadID);
        });
    }

    stopBot() {
        this.isRunning = false;
        this.isListening = false;
        this.currentGroup = null;
        this.api = null;
        console.log('🛑 Bot stopped successfully');
    }
}

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

// Create HTML file
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facebook Masti Bot</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        textarea, input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        textarea:focus, input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        textarea {
            height: 120px;
            resize: vertical;
            font-family: monospace;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }
        
        button {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .start-btn {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
        }
        
        .stop-btn {
            background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
            color: white;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
        }
        
        .status-online {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-offline {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .instructions {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        
        .instructions h3 {
            color: #333;
            margin-bottom: 15px;
        }
        
        .instructions ul {
            list-style-position: inside;
            color: #666;
        }
        
        .instructions li {
            margin-bottom: 8px;
        }
        
        .bot-commands {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .bot-commands h3 {
            color: #1565c0;
            margin-bottom: 15px;
        }
        
        .command-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        
        .command {
            background: white;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #2196f3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Facebook Masti Bot</h1>
            <p>Created by V4MPIR3 R1S3 OWN3R R4J M1SHR4</p>
        </div>
        
        <div class="content">
            <div class="form-group">
                <label for="appstate">AppState JSON:</label>
                <textarea id="appstate" placeholder='Paste your appstate JSON here... Example: [{"key":"cookie","value":"your_cookie_value"}]'></textarea>
            </div>
            
            <div class="form-group">
                <label for="groupId">Group ID:</label>
                <input type="text" id="groupId" placeholder="Enter Facebook Group ID where bot should run">
            </div>
            
            <div class="button-group">
                <button class="start-btn" onclick="startBot()">🚀 Start Bot</button>
                <button class="stop-btn" onclick="stopBot()">🛑 Stop Bot</button>
            </div>
            
            <div id="status" class="status status-offline">
                🔴 Bot is currently offline
            </div>
            
            <div class="instructions">
                <h3>📝 How to get AppState:</h3>
                <ul>
                    <li>Use FCA-Mafia or similar tools to get your Facebook appstate</li>
                    <li>Copy the entire JSON array and paste above</li>
                    <li>Get Group ID from Facebook group URL</li>
                    <li>Click Start Bot to begin the fun! 🎉</li>
                </ul>
            </div>
            
            <div class="bot-commands">
                <h3>🎯 Bot Commands:</h3>
                <div class="command-list">
                    <div class="command"><strong>#bot</strong> - Introduction</div>
                    <div class="command"><strong>#bot hello</strong> - Greeting</div>
                    <div class="command"><strong>#bot joke</strong> - Funny joke</div>
                    <div class="command"><strong>#bot dance</strong> - Virtual dance</div>
                    <div class="command"><strong>#bot love</strong> - Love message</div>
                    <div class="command"><strong>#bot time</strong> - Current time</div>
                    <div class="command"><strong>#bot quote</strong> - Motivation</div>
                    <div class="command"><strong>#bot meme</strong> - Meme ideas</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function startBot() {
            const appstate = document.getElementById('appstate').value;
            const groupId = document.getElementById('groupId').value;
            
            if (!appstate || !groupId) {
                alert('Please fill in both AppState and Group ID!');
                return;
            }
            
            try {
                const response = await fetch('/start-bot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ appstate, groupId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('status').className = 'status status-online';
                    document.getElementById('status').innerHTML = '🟢 Bot is running in group: ' + groupId;
                    alert('Bot started successfully! 🎉');
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error starting bot: ' + error.message);
            }
        }
        
        async function stopBot() {
            try {
                const response = await fetch('/stop-bot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const result = await response.json();
                
                document.getElementById('status').className = 'status status-offline';
                document.getElementById('status').innerHTML = '🔴 Bot is currently offline';
                alert('Bot stopped successfully!');
            } catch (error) {
                alert('Error stopping bot: ' + error.message);
            }
        }
        
        // Check bot status periodically
        async function checkStatus() {
            try {
                const response = await fetch('/bot-status');
                const status = await response.json();
                
                if (status.isRunning) {
                    document.getElementById('status').className = 'status status-online';
                    document.getElementById('status').innerHTML = '🟢 Bot is running in group: ' + (status.currentGroup || 'Unknown');
                } else {
                    document.getElementById('status').className = 'status status-offline';
                    document.getElementById('status').innerHTML = '🔴 Bot is currently offline';
                }
            } catch (error) {
                console.log('Error checking status:', error);
            }
        }
        
        // Check status every 10 seconds
        setInterval(checkStatus, 10000);
        checkStatus(); // Initial check
    </script>
</body>
</html>`;

// Write HTML file
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), htmlContent);

// Start the bot
const bot = new FacebookBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot... Bye bye! 👋');
    if (bot.api) {
        bot.stopBot();
    }
    process.exit(0);
});
