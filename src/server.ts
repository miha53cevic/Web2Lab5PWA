import express from 'express';
import path from 'path';
import sqlite3 from 'sqlite3';
sqlite3.verbose();
import multer from 'multer';
import webpush from 'web-push';

const upload = multer();

const db = new sqlite3.Database(':memory:');

const vapidPrivateKey = "MF-Hi1VXsK5Zp0dAJGP3Osj7fsO2sIeKnwrVuWCQ8LE";
const vapidPublicKey = "BHt50kvw32I1MzmaCzsxxs6jthmqnHzab-iOM5dSZqVsbQ_LltA1q8LVh_U9VtxxHFNsnjg-ihDSfq1joEASeDc";

db.serialize(() => {
    db.run(`CREATE TABLE audioZapisi (
        id TEXT PRIMARY KEY,
        naziv TEXT,
        audioBlob BLOB
    )`);
    db.run(`CREATE TABLE subscriptions (
        sub TEXT PRIMARY KEY
    )`);
});

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serviraj public/* datoteke

app.get('/api/audio', (req, res) => {
    db.serialize(() => {
        db.all(`SELECT naziv, audioBlob FROM audioZapisi`, (error, rows) => {
            if (error) return res.status(500).send(JSON.stringify(error));
            return res.send(rows);
        });
    });
});

// Note za ubuduće, sqlite3 blob se sprema kao {type: 'buffer', data: []} di je data tipa Uint8Array ali se kod dohvaćanja iz baze pretvoriti u Uint8Array
app.post('/api/audio', upload.single('audioBlob'), (req, res) => {
    const data = req.body;
    console.log(data);
    console.log(req.file);
    db.serialize(() => {
        db.run(`INSERT INTO audioZapisi VALUES (?, ?, ?)`, [data.id, data.naziv, req.file?.buffer], (error) => {
            if (error) return res.status(500).send(JSON.stringify(error));
            // Posalji push notification svima da je sinkroniziran novi audio zapis
            sendPushNotificationSyncAudio(data.naziv);
            return res.sendStatus(201);
        });
    });
});

app.post("/api/saveSubscription", (req, res) => {
    const { sub } = req.body;
    console.log(sub);
    db.serialize(() => {
        db.run(`INSERT INTO subscriptions VALUES (?)`, [JSON.stringify(sub)], (error) => {
            if (error) return res.status(500).send(JSON.stringify(error));
            return res.sendStatus(201);
        });
    });
});

function sendPushNotificationSyncAudio(audioNaziv: string) {
    webpush.setVapidDetails('mailto:mihael.petricevic@fer.hr', vapidPublicKey, vapidPrivateKey);
    db.serialize(() => {
        db.all(`SELECT sub FROM subscriptions`, async (error, rows) => {
            if (error) return console.error(error);
            for (const row of rows) {
                const sub = JSON.parse((row as any).sub);
                console.log(sub);
                try {
                    await webpush.sendNotification(sub, JSON.stringify({
                        title: 'Sinkroniziran novi audio zapis: ' + audioNaziv,
                        body: `Dodan/Sinkroniziran je novi audio zapis!`,
                        redirectUrl: '/index.html'
                    }));
                    console.log("Sent notification to: ", sub);
                } catch (error) {
                    console.error(error);
                }
            }
        });
    });
}

app.use((req, res) => {
    res.sendStatus(404);
})

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Running on port ${port}`);
});