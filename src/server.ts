import express from 'express';
import path from 'path';
import sqlite3 from 'sqlite3';
sqlite3.verbose();
import multer from 'multer';

const upload = multer();

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run(`CREATE TABLE audioZapisi (
        id TEXT PRIMARY KEY,
        naziv TEXT,
        audioBlob BLOB
    )`);
});

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serviraj public/* datoteke

app.get('/api/audio', (req, res) => {
    db.serialize(() => {
        db.all(`SELECT naziv, audioBlob FROM audioZapisi`, (error, rows) => {
            if (error) return res.send(JSON.stringify(error));
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
            if (error) return res.send(JSON.stringify(error));
            return res.sendStatus(201);
        });
    });
});

app.use((req, res) => {
    res.sendStatus(404);
})

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Running on port ${port}`);
});