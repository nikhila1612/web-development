import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "permalist",
  password: "16122000",
  port: 5432,
});
db.connect();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let items = [];


app.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM items ORDER BY id ASC");
  items = result.rows;
  res.render("index.ejs", {
    listTitle: "Today",
    listItems: items,
  });
});

app.post("/add", async(req, res) => {
  const item = req.body.newItem;
  await db.query("INSERT INTO items (title) VALUES ($1)",[item])
  res.redirect("/");
});

app.post("/edit", async (req, res) => {
  const updateItem = req.body.updatedItemTitle;
  const updateId=req.body.updatedItemId;
  await db.query("UPDATE items SET title =$1 WHERE id = $2",[updateItem,updateId]);
  res.redirect('/');

});

app.post("/delete", async(req, res) => {
  const itemId = req.body.deleteItemId
  await db.query("DELETE FROM items WHERE id = $1",[itemId]);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
