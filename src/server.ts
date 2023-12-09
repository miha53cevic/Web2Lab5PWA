import express from 'express';
import path from 'path';

const app = express();

app.use(express.json()); // prihvacaj body
app.use(express.static(path.join(__dirname, 'public'))); // serviraj public/* datoteke

app.use((req, res) => {
    res.sendStatus(404);
})

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Running on port ${port}`);
});