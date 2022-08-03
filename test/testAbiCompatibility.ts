import {expect} from 'chai';
import {getAbiCompatibilityReport} from '../src/checkAbiCompatibility';
import {ABI} from '../types';

describe('Test Validate Abi Compatibility mechanism', () => {
  let abi: ABI;

  beforeEach(() => {
    abi = [
      // event object
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'address',
            name: 'eventParameter1',
            type: 'address',
          },
        ],
        name: 'eventName',
        type: 'event',
      },
      // error object
      {
        inputs: [
          {
            internalType: 'address',
            name: 'errorParameter',
            type: 'address',
          },
        ],
        name: 'errorName',
        type: 'error',
      },
      // function object
      {
        inputs: [
          {
            internalType: 'address',
            name: 'functionParameter',
            type: 'address',
          },
        ],
        name: 'functionName',
        outputs: [
          {
            internalType: 'bool',
            name: '',
            type: 'bool',
          },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];
  });

  describe('test event compatibility', () => {
    it('change name should should failed', () => {
      const newEventObject = {
        ...abi[0],
        name: 'newEventName',
      };
      const newAbi = [newEventObject, ...abi.slice(1)];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('remove parameter should failed', () => {
      const newEventObject = {
        ...abi[0],
        inputs: [],
      };
      const newAbi = [newEventObject, ...abi.slice(1)];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('remove event should failed', () => {
      const newAbi = [...abi.slice(1)];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('change paramter type should failed', () => {
      const newEventObject = {
        ...abi[0],
        inputs: [{...abi[0].inputs[0], type: 'bool'}],
      };
      const newAbi = [newEventObject, ...abi.slice(1)];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('add parameter should failed', () => {
      const newEventObject = {
        ...abi[0],
        inputs: [...abi[0].inputs, abi[0].inputs[0]],
      };
      const newAbi = [newEventObject, ...abi.slice(1)];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('without any change should succeed', () => {
      const report = getAbiCompatibilityReport(abi, abi);
      expect(report.pass).to.equal(true);
    });
    it('add new event should succeed', () => {
      const newEventObject = {
        ...abi[0],
        inputs: [{...abi[0].inputs[0], type: 'bool'}],
      };
      const newAbi = [newEventObject, ...abi];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(true);
    });
  });

  describe('test error compatibility', () => {
    it('change name should should failed', () => {
      const newErrorObject = {
        ...abi[1],
        name: 'newrErrortName',
      };
      const newAbi = [abi[0], newErrorObject, abi[2]];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('remove parameter should failed', () => {
      const newErrorObject = {
        ...abi[1],
        inputs: [],
      };
      const newAbi = [abi[0], newErrorObject, abi[2]];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('remove error should failed', () => {
      const newAbi = [abi[0], abi[2]];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('change paramter type should failed', () => {
      const newErrorObject = {
        ...abi[1],
        inputs: [{...abi[1].inputs[0], type: 'bool'}],
      };
      const newAbi = [abi[0], newErrorObject, abi[2]];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('add parameter should failed', () => {
      const newErrorObject = {
        ...abi[1],
        inputs: [...abi[1].inputs, abi[1].inputs[0]],
      };
      const newAbi = [abi[0], newErrorObject, abi[2]];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('without any change should succeed', () => {
      const report = getAbiCompatibilityReport(abi, abi);
      expect(report.pass).to.equal(true);
    });

    it('add new error should succeed', () => {
      const newErrorObject = {
        ...abi[1],
        inputs: [{...abi[1].inputs[0], type: 'bool'}],
      };
      const newAbi = [newErrorObject, ...abi];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(true);
    });
  });

  describe('test function compatibility', () => {
    it('change name should should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        name: 'newrFunctionName',
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('remove parameter should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        inputs: [],
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('remove function should failed', () => {
      const newAbi = [...abi.slice(0, 2)];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('change paramter type should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        inputs: [{...abi[2].inputs[0], type: 'bool'}],
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('add parameter should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        inputs: [...abi[2].inputs, abi[2].inputs[0]],
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('remove output parameter should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        outputs: [],
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('change output parameter type should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        outputs: [{...abi[2].outputs[0], type: 'address'}],
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('change stateMutability to view should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        stateMutability: 'view',
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('change stateMutability to payable should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        stateMutability: 'payable',
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('change stateMutability to pure should failed', () => {
      const newFunctionObject = {
        ...abi[2],
        stateMutability: 'pure',
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(false);
    });

    it('without any change should succeed', () => {
      const report = getAbiCompatibilityReport(abi, abi);
      expect(report.pass).to.equal(true);
    });

    it('add new function should succeed', () => {
      const newFunctionObject = {
        ...abi[2],
        inputs: [{...abi[2].inputs[0], type: 'bool'}],
      };
      const newAbi = [newFunctionObject, ...abi];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(true);
    });

    it('add output parameter should succeed', () => {
      const newFunctionObject = {
        ...abi[2],
        outputs: [...abi[2].outputs, abi[2].outputs[0]],
      };
      const newAbi = [...abi.slice(0, 2), newFunctionObject];
      const report = getAbiCompatibilityReport(abi, newAbi);
      expect(report.pass).to.equal(true);
    });
  });
});
