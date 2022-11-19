import { rememberSync } from '..';

type MyType = {
    foo: string;
    bar?: number;
}

let myState: MyType = {
    foo: 'foo'
};

myState = rememberSync('memory', myState);
console.log(myState);
myState.bar = 42;
