const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const addDays = require("date-fns/addDays");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const invalidScenarios = (request, response, next) => {
  const { search_q = "", status, priority, category, date } = request.query;
  const invalidStatus =
    status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE";
  const invalidPriority =
    priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW";
  const invalidCategory =
    category !== "WORK" && category !== "HOME" && category !== "LEARNING";
  if (status !== undefined && invalidStatus) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (priority !== undefined && invalidPriority) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (category !== undefined && invalidCategory) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (date !== undefined) {
    //console.log(formatDate);
    const isValidDate = isValid(new Date(date));
    //console.log(isValidDate);
    if (isValidDate) {
      const year = date.split("-")[0];
      const month = date.split("-")[1];
      const day = date.split("-")[2];
      const formatDate = format(new Date(year, month - 1, day), "yyyy-MM-dd");
      request.dueDate = formatDate;
      next();
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    next();
  }
};

app.get("/todos/", invalidScenarios, async (request, response) => {
  const { search_q = "", status, priority, category } = request.query;
  let result = null;
  let getTodosQuery = "";
  switch (true) {
    case status !== undefined:
      getTodosQuery = `
            SELECT id,todo,priority,status,category,due_date AS dueDate
            FROM todo
            WHERE todo LIKE "%${search_q}%" AND
            status = '${status}';`;
      result = await db.all(getTodosQuery);
      response.send(result);
      break;
    case priority !== undefined:
      getTodosQuery = `
            SELECT id,todo,priority,status,category,due_date AS dueDate
            FROM todo
            WHERE todo LIKE "%${search_q}%" AND
            priority = '${priority}';`;
      result = await db.all(getTodosQuery);
      response.send(result);
      break;
    case status !== undefined && priority !== undefined:
      getTodosQuery = `
            SELECT id,todo,priority,status,category,due_date AS dueDate
            FROM todo
            WHERE todo LIKE "%${search_q}%" AND
            priority = '${priority}' AND
            status = '${status}';`;
      result = await db.all(getTodosQuery);
      response.send(result);
      break;
    case status !== undefined && category !== undefined:
      getTodosQuery = `
            SELECT id,todo,priority,status,category,due_date AS dueDate
            FROM todo
            WHERE todo LIKE "%${search_q}%" AND
            category = '${category}' AND
            status = '${status}';`;
      result = await db.all(getTodosQuery);
      response.send(result);
      break;
    case category !== undefined:
      getTodosQuery = `
            SELECT id,todo,priority,status,category,due_date AS dueDate
            FROM todo
            WHERE todo LIKE "%${search_q}%" AND
            category = '${category}';`;
      result = await db.all(getTodosQuery);
      response.send(result);
      break;
    case search_q !== undefined:
      getTodosQuery = `
            SELECT id,todo,priority,status,category,due_date AS dueDate
            FROM todo
            WHERE todo LIKE "%${search_q}%" ;`;
      result = await db.all(getTodosQuery);
      response.send(result);
      break;
    case category !== undefined && priority !== undefined:
      getTodosQuery = `
        SELECT id,todo,priority,status,category,due_date AS dueDate
        FROM todo
        WHERE todo LIKE "%${search_q}%" AND
        category = '${category}' AND 
        priority = '${priority}';`;
      result = await db.all(getTodosQuery);
      response.send(result);
      break;
  }
});

app.get("/todos/:todoId/", invalidScenarios, async (request, response) => {
  const { todoId } = request.params;
  const getTodo = `
    SELECT id,todo,priority,status,category,due_date AS dueDate
    FROM todo
    WHERE id = '${todoId}';`;
  const todoInfo = await db.get(getTodo);
  response.send(todoInfo);
});

app.get("/agenda/", invalidScenarios, async (request, response) => {
  const { dueDate } = request;
  const getSelectedDateQuery = `
        SELECT id,todo,priority,status,category,due_date AS dueDate
        FROM todo
        WHERE due_date = '${dueDate}';`;
  const result = await db.all(getSelectedDateQuery);
  response.send(result);
});

app.post("/todos/", invalidScenarios, async (request, response) => {
  const { id, todo, priority, status, category } = request.body;
  const { dueDate } = request;
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status, category, due_date)
  VALUES
    ('${id}', '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", invalidScenarios, async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateTodo = "";
  let updatedColumn = "";
  switch (true) {
    case requestBody.status !== undefined:
      updatedColumn = "Status";
      updateTodo = `
        UPDATE
            todo
        SET
            status='${requestBody.status}'
        WHERE
            id = '${todoId}';`;
      break;
    case requestBody.priority !== undefined:
      updatedColumn = "Priority";
      updateTodo = `
        UPDATE
            todo
        SET
            priority='${requestBody.priority}'
        WHERE
            id = '${todoId}';`;
      break;
    case requestBody.todo !== undefined:
      updatedColumn = "Todo";
      updateTodo = `
        UPDATE
            todo
        SET
            todo='${requestBody.todo}'
        WHERE
            id = '${todoId}';`;
      break;
    case requestBody.category !== undefined:
      updatedColumn = "Category";
      updateTodo = `
        UPDATE
            todo
        SET
            category='${requestBody.category}'
        WHERE
            id = '${todoId}';`;
      break;
    case requestBody.dueDate !== undefined:
      updatedColumn = "Due Date";
      updateTodo = `
        UPDATE
            todo
        SET
            due_date='${requestBody.dueDate}'
        WHERE
            id = '${todoId}';`;
      break;
  }
  const todoInfo = await db.run(updateTodo);
  response.send(`${updatedColumn} Updated`);
});

app.delete("/todos/:todoId/", invalidScenarios, async (request, response) => {
  const { todoId } = request.params;
  const delTodoQuery = `
    DELETE 
    FROM todo
    WHERE id = '${todoId}';`;
  await db.run(delTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
