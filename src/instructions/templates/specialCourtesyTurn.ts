import { typedParse } from "../../utils";
import { LRInstructionTemplateSchema } from "./_base";

export default typedParse(LRInstructionTemplateSchema, {
  name: "special courtesy turn",
  defaultBeats: 8,
  basis: { x: { type: "PureDirection", dir: "on_right" }, y: { type: "PureDirection", dir: "in_front" } },
  fieldsDisplay: [],
  keyframes: [
    {
      dur: 1,
      states: {
        lark: {
          relPos: {
            x: 0.22746833240298955,
            y: -0.22894323687997906,
          },
          relFacing: 0.924259413744736,
        },
        robin: {
          relPos: {
            x: -0.18254879322415424,
            y: 0.3160138288951989,
          },
          relFacing: 0.911571916920715,
        },
      },
    },
    {
      dur: 1,
      states: {
        lark: {
          relPos: {
            x: 0.4888118902129925,
            y: -0.26448367701907877,
          },
          relFacing: 1.5266860981767065,
        },
        robin: {
          relPos: {
            x: -0.5030788032017225,
            y: 0.317875763201089,
          },
          relFacing: 1.595281228555089,
        },
      },
    },
    {
      dur: 1,
      states: {
        lark: {
          relPos: {
            x: 0.763191700497042,
            y: -0.16438048283880616,
          },
          relFacing: 2.211701382354999,
        },
        robin: {
          relPos: {
            x: -0.7625215216967278,
            y: 0.20469392677717174,
          },
          relFacing: 2.4028979572792575,
        },
      },
    },
    {
      dur: 1,
      states: {
        lark: {
          relPos: {
            x: 0.8058211976384516,
            y: -0.010038865956292418,
          },
          relFacing: 3.107379322994694,
        },
        robin: {
          relPos: {
            x: -0.8150518384969084,
            y: -0.02967210202363229,
          },
          relFacing: -3.1026160127641003,
        },
      },
    },
  ],
});
