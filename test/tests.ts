// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";

// import { ExampleBuidlerRuntimeEnvironmentField } from "../src/ExampleBuidlerRuntimeEnvironmentField";

import { useEnvironment } from "./helpers";

describe("Integration tests examples", function() {
  describe("Buidler Runtime Environment extension", function() {
    useEnvironment(__dirname + "/buidler-project");

    // it("It should add the example field", function() {
    //   assert.instanceOf(
    //     this.env.example,
    //     ExampleBuidlerRuntimeEnvironmentField
    //   );
    // });

    // it("The example filed should say hello", function() {
    //   assert.equal(this.env.example.sayHello(), "hello");
    // });
  });
});

describe("Unit tests examples", function() {
  describe("ExampleBuidlerRuntimeEnvironmentField", function() {
    describe("sayHello", function() {
      // it("Should say hello", function() {
      //   const field = new ExampleBuidlerRuntimeEnvironmentField();
      //   assert.equal(field.sayHello(), "hello");
      // });
    });
  });
});
