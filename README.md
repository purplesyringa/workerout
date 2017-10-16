# WorkerOut

> Library that makes any operation async

## Why?

No need to write much code to move some command to web worker. Just use a library!

## Usage

### Translating sync operation to async

```javascript
let json = '{"a":{"b":{"c":"d"}}}'; // 40KB of JSON

// Sync
let parsed = JSON.parse(json); // Wait
alert(parsed);

// Async
let worker = new WorkerOut();
let parsed = worker.JSON.parse(json);
parsed.then(alert);
```

### Using promises

```javascript
let address = "https://cors-anywhere.herokuapp.com/";

// Promises
fetch(address)
    .then(response => response.text())
    .then(alert);

// Worker
let worker = new WorkerOut();
worker.fetch(address)
    .then(response => response.text())
    .then(alert);
```

### Your functions

```javascript
let json = '{"a":{"b":{"c":"d"}}}'; // 40KB of JSON

let parseAndDoCoolThings = json => {
    return Object.entries(JSON.parse(json)).length;
};

// Sync
alert(parseAndDoCoolThings(json));

// Async
let worker = new WorkerOut();
worker(() => parseAndDoCoolThings(json)).then(alert);
```

### Passing data

```javascript
let json = '{"a":{"b":{"c":"d"}}}'; // 40KB of JSON

let CoolClass = {};

CoolClass.parse = json => {
    return JSON.parse(json);
};
CoolClass.calculate = json => {
    return Object.entries(json).length;
};
CoolClass.getAnswer = json => {
    return CoolClass.calculate(CoolClass.parse(json)) + 41;
};

// Sync
alert(CoolClass.getAnswer(json));

// Async
let worker = new WorkerOut();
worker.CoolClass = CoolClass;
worker.CoolClass.getAnswer(json).then(alert);
```

## Methods

1. Save and load data:
    ```javascript
    worker.answer = 42;
    console.log(worker.answer); // 42
    ```

2. Call WorkerOut as a function to make it async:
    ```javascript
    worker(() => answer); // Promise <42>
    ```

3. Call default functions:
    ```javascript
    worker.JSON.parse("{}"); // Promise <Object {}>
    ```
