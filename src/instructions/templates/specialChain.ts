import { typedParse } from "../../utils";
import { LLRRInstructionTemplateSchema } from "./_base";

export default typedParse(LLRRInstructionTemplateSchema, {
  name: "special chain",
  defaultBeats: 8,
  fieldsDisplay: [
    "to ",
    {
      field: "basis_x",
    },
  ],
  basis: {
    x: {
      type: "choreographer_specified_identifier",
    },
    y: {
      type: "PersonInDirection",
      dir: "larks_right_robins_left",
    },
    assumedX: {
      type: "PersonInDirection",
      dir: "across",
    },
  },
  keyframes: [
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: -0.009139805825242986,
            y: 0.19115631067961159,
          },
          relFacing: 2.3157541225847753,
        },
        up_robin_0: {
          relPos: {
            x: 0.21053980582524257,
            y: 0.3152106796116505,
          },
          relFacing: -0.5191461142465229,
        },
        down_lark_0: {
          relPos: {
            x: -0.009139805825242986,
            y: 0.19115631067961159,
          },
          relFacing: 2.3157541225847753,
        },
        down_robin_0: {
          relPos: {
            x: 0.21053980582524257,
            y: 0.3152106796116505,
          },
          relFacing: -0.5191461142465229,
        },
      },
    },
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: 0.0011980582524269145,
            y: 0.3746533980582525,
          },
          relFacing: 3.141592653589793,
        },
        up_robin_0: {
          relPos: {
            x: 0.43538834951456296,
            y: 0.697711650485437,
          },
          relFacing: -1.2667953874547524,
        },
        down_lark_0: {
          relPos: {
            x: 0.0011980582524269145,
            y: 0.3746533980582525,
          },
          relFacing: 3.141592653589793,
        },
        down_robin_0: {
          relPos: {
            x: 0.43538834951456296,
            y: 0.697711650485437,
          },
          relFacing: -1.2667953874547524,
        },
      },
    },
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: 0.006366990291261976,
            y: 0.5839951456310679,
          },
          relFacing: -2.845314295703873,
        },
        up_robin_0: {
          relPos: {
            x: 0.8204737864077671,
            y: 0.4470184466019418,
          },
          relFacing: -2.5864140774691884,
        },
        down_lark_0: {
          relPos: {
            x: 0.006366990291261976,
            y: 0.5839951456310679,
          },
          relFacing: -2.845314295703873,
        },
        down_robin_0: {
          relPos: {
            x: 0.8204737864077671,
            y: 0.4470184466019418,
          },
          relFacing: -2.5864140774691884,
        },
      },
    },
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: 0.003782524271844556,
            y: 0.7778300970873788,
          },
          relFacing: -1.5795680316393392,
        },
        up_robin_0: {
          relPos: {
            x: 1.003970873786408,
            y: 0.19890970873786407,
          },
          relFacing: -1.598957893782789,
        },
        down_lark_0: {
          relPos: {
            x: 0.003782524271844556,
            y: 0.7778300970873788,
          },
          relFacing: -1.5795680316393392,
        },
        down_robin_0: {
          relPos: {
            x: 1.003970873786408,
            y: 0.19890970873786407,
          },
          relFacing: -1.598957893782789,
        },
      },
    },
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: 0.23896893203883485,
            y: 0.6563601941747574,
          },
          relFacing: -0.7378150601204646,
        },
        up_robin_0: {
          relPos: {
            x: 1.2391572815533982,
            y: 0.29195048543689317,
          },
          relFacing: -0.6947382761967036,
        },
        down_lark_0: {
          relPos: {
            x: 0.23896893203883485,
            y: 0.6563601941747574,
          },
          relFacing: -0.7378150601204646,
        },
        down_robin_0: {
          relPos: {
            x: 1.2391572815533982,
            y: 0.29195048543689317,
          },
          relFacing: -0.6947382761967036,
        },
      },
    },
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: 0.293242718446602,
            y: 0.4909543689320388,
          },
          relFacing: -0.009900666587988355,
        },
        up_robin_0: {
          relPos: {
            x: 1.314106796116505,
            y: 0.5323058252427186,
          },
          relFacing: 0.007999829339887146,
        },
        down_lark_0: {
          relPos: {
            x: 0.293242718446602,
            y: 0.4909543689320388,
          },
          relFacing: -0.009900666587988355,
        },
        down_robin_0: {
          relPos: {
            x: 1.314106796116505,
            y: 0.5323058252427186,
          },
          relFacing: 0.007999829339887146,
        },
      },
    },
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: 0.2027864077669903,
            y: 0.29970388349514554,
          },
          relFacing: 0.7853981633974486,
        },
        up_robin_0: {
          relPos: {
            x: 1.2133126213592234,
            y: 0.7494009708737863,
          },
          relFacing: 0.7305083008032948,
        },
        down_lark_0: {
          relPos: {
            x: 0.2027864077669903,
            y: 0.29970388349514554,
          },
          relFacing: 0.7853981633974486,
        },
        down_robin_0: {
          relPos: {
            x: 1.2133126213592234,
            y: 0.7494009708737863,
          },
          relFacing: 0.7305083008032948,
        },
      },
    },
    {
      dur: 1,
      states: {
        up_lark_0: {
          relPos: {
            x: -0.001386407766990505,
            y: 0.22733883495145624,
          },
          relFacing: 1.5987610627647622,
        },
        up_robin_0: {
          relPos: {
            x: 0.9988019417475731,
            y: 0.7985058252427186,
          },
          relFacing: 1.5620246219504532,
        },
        down_lark_0: {
          relPos: {
            x: -0.001386407766990505,
            y: 0.22733883495145624,
          },
          relFacing: 1.5987610627647622,
        },
        down_robin_0: {
          relPos: {
            x: 0.9988019417475731,
            y: 0.7985058252427186,
          },
          relFacing: 1.5620246219504532,
        },
      },
    },
  ],
});
