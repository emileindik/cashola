# cashola
> Persist the state of an object across processes with one line of code. 

There are two main benefits to using this project over a traditional state management solution.  
(1) Simpler than introducing a database-like resource into your architecture. Consider if this makes sense for your particular use case.  
(2) No need to write code to intercept state updates, save those updates, nor fetch the current state. Simply modify your state object like you normally would and the js Proxy object will take care of the rest.  

`cashola` uses your local filesystem to persist state under-the-hood.

## Install

```bash
npm install cashola
```

## Usage

#### Basic usage
Here's a server that handles requests which alter some internal state object. After a server restart, `myState` variable would lose its state or need to fetch it from an external source. `cashola` allows `myState` to retain all state data from the previous server process.
```ts
import { rememberSync } from 'cashola';

const myState = rememberSync('event-server-example');

listener.on('event', (key, value) => {
    myState[key] = value;
});

// myState during first run: { event1: 'hello' }
// myState after server reboot during second run: { event1: 'hello', event2: 'world' }
```

Alternatively, you can use `cashola` to retain results from long-running calculations.
```ts
import { rememberSync } from 'cashola';

const myState = rememberSync('fibonacci-example');

if (!myState.result) {
    myState.result = calculateFibonacci(1000);
}

console.log('1000th fibanonacci value:', myState.result);

// The first run will calculate calculateFibonacci(1000)
// The second run will already have myState.result so the calculation will be skipped
```

In this exmaple, after the first run `myState` will hold one record. After the second run `myState` will hold two records, the original timeString from the first run and a newer timeString from the second run.
```ts
// ~Runnable example~
import { rememberSync } from 'cashola';

// Here we optionally add Record<string, string> type to
// the function call in order to type our return value using typescript.
const myState = rememberSync<Record<string, string>>('timestamp-example');

console.log('Before:', myState);
// First run: {}
// Second run: { <timeString1>: 'hi! }
myState[new Date().getTime().toString()] = 'hi!';
console.log('After:', myState);
// First run: { <timeString1>: 'hi! }
// Second run: { <timeString1>: 'hi!, <timeString2>: 'hi! }
```

#### Modify configuration
You can configure the filesystem storage directory as well as whether or not to disable `cashola`. If you disable `cashola` (using either an env var or the explicit property `ignoreCashola: true`) then none of the remember() functions will attempt to fetch data from the state storage.
```ts
import { rememberSync, configure } from 'cashola';

configure({
    /**
     * Directory to use as storage  
     * Default: .cashola/  
     */
    storageDir: 'my/state/dir',

    /**
     * Name of environment variable used to ignore cashola  
     * Default: IGNORE_CASHOLA  
     * To use, set to true `IGNORE_CASHOLA=true node index.js`  
     */
    ignoreCasholaEnvVar: 'IGNORE',

    /**
     * Boolean whether or not to ignore cashola  
     * This takes precedence over any env var that is passed
     * Default: false  
     */
    ignoreCashola: true
});

const myState = rememberSync('timestamp-example');
console.log(myState);
// {}
```

#### Starter object
You can optionally pass a starter object to any of the remember() functions. If no existing state is found for the given key, the starter object will be used to create the initial state. Run this example twice.
```ts
import { rememberSync } from 'cashola';

type MyType = {
    foo: string;
    bar?: number;
}

let myState: MyType = {
    foo: 'foo'
};

myState = rememberSync('starter-obj-example', myState);

console.log('Before:', myState);
// First run: { foo: 'foo' }
// Second run: { foo: 'foo', bar: 42 }
myState.bar = 42;
console.log('After:', myState);
// First run: { foo: 'foo', bar: 42 }
// Second run: { foo: 'foo', bar: 42 }
```

#### Async remember()
It is recommended to use the async version of the remember() functions.
```ts
import { remember } from 'cashola';

(async () => {
    const myState = await remember('starter-obj-example');
    console.log(myState);
    // { foo: 'foo', bar: 42 }
})()
.catch(console.error);
```

#### Using npm command
It is sometimes useful to remove storage from outside the sourcecode of a program.  
The `cashola-clear-all` command takes an optional storageDir path.  
The `cashola-clear` command takes an object key and an optional storageDir path.  

*package.json*
```json
"scripts": {
  "clear": "cashola-clear",
  "clear-all": "cashola-clear-all"
  ...
}
```
```sh
npm run clear -- starter-obj-example
# With storageDir specified as ./.cashola
npm run clear -- timestamp-example ./.cashola

npm run clear-all
# With storageDir specified as ./.cashola
npm run clear -- ./.cashola
```
Or without the package.json modifications:
```sh
./node_modules/cashola/.bin/cashola-clear-all
```


## Methods
| Method      | Description |
| ----------- | ----------- |
| rememberSync(key: string, obj?: object)      | Remembers an object, with an optional starter object. Synchronous        |
| remember(key: string, obj?: object)          | Remembers an object, with an optional starter object. Asynchronous       |
| rememberArraySync(key: string, obj?: any[])  | Remembers an array, with an optional starter array. Synchronous         |
| rememberArray(key: string, obj?: any[])      | Remembers an array, with an optional starter array. Asynchronous        |
| configure(config: Config)                    | Allows for disabling cashola and changing storage path. Configs shown in example above.        |
| clearSync(key: string)                       | Removes the state of a single object        |
| clear(key: string)                           | Removes the state of a single object        |
| clearAllSync()                               | Removes all stored state        |
| clearAll()                                   | Removes all stored state        |
| list()                                       | Lists keys of currently stored state objects.        |

## Further work
- Implement TTL or some sort of storage expiration
- Offer database connections (mongodb, postgres, redis) for storage instead of filesystem

## Setup

```sh
git clone git@github.com:emileindik/cashola.git
cd cashola
npm ci
npm run build
npm test
