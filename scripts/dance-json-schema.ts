import { type z as Z, z } from "zod";

import {
  DancerIdSchema,
  DancerOffsetSchema,
  ProgressionDirSchema,
  ProtoIdSchema,
} from "../src/contraCore";
import {
  CalledDirectionSchema,
  CardinalDirectionSchema,
  PureDirectionSchema,
  TowardsLabelDirectionSchema,
  TowardsPersonDirectionSchema,
} from "../src/directions";
import {
  CalledIdentifierSchema,
  PersonInDirectionSchema,
} from "../src/identifiers";
import { AtomicInstructionSchema } from "../src/instructions/_atomic";
import { InstructionIdSchema } from "../src/instructions/_base";
import { AllemandeInstructionSchema } from "../src/instructions/allemande";
import { BalanceInstructionSchema } from "../src/instructions/balance";
import { BalanceTheRingInstructionSchema } from "../src/instructions/balanceTheRing";
import { BendTheLineInstructionSchema } from "../src/instructions/bendTheLine";
import { BoxCirculateInstructionSchema } from "../src/instructions/boxCirculate";
import { BoxTheGnatInstructionSchema } from "../src/instructions/boxTheGnat";
import { CaliforniaTwirlInstructionSchema } from "../src/instructions/californiaTwirl";
import { CircleInstructionSchema } from "../src/instructions/circle";
import { CourtesyTurnInstructionSchema } from "../src/instructions/courtesyTurn";
import { DoSiDoInstructionSchema } from "../src/instructions/doSiDo";
import { DownTheHallInstructionSchema } from "../src/instructions/downTheHall";
import { DropHandsInstructionSchema } from "../src/instructions/dropHands";
import { FaceInstructionSchema } from "../src/instructions/face";
import { FormLongWavesInstructionSchema } from "../src/instructions/formLongWaves";
import { FormShortWavesInstructionSchema } from "../src/instructions/formShortWaves";
import { GiveAndTakeIntoSwingInstructionSchema } from "../src/instructions/giveAndTakeIntoSwing";
import { GreetNewNeighborsInstructionSchema } from "../src/instructions/greetNewNeighbors";
import { GreetShadowInstructionSchema } from "../src/instructions/greetShadow";
import {
  DanceSchema,
  InitFormationNameSchema,
  InitFormationSchema,
  InstructionSchema,
} from "../src/instructions/index";
import { LongLineInCenterInstructionSchema } from "../src/instructions/longLineInCenter";
import { LongLinesForwardBackInstructionSchema } from "../src/instructions/longLinesForwardBack";
import { MadRobinInstructionSchema } from "../src/instructions/madRobin";
import { PassByInstructionSchema } from "../src/instructions/passBy";
import { PetronellaInstructionSchema } from "../src/instructions/petronella";
import { PoussetteInstructionSchema } from "../src/instructions/poussette";
import { PullByInstructionSchema } from "../src/instructions/pullBy";
import { RightLeftThroughInstructionSchema } from "../src/instructions/rightLeftThrough";
import {
  RollAwayInstructionSchema,
  RolleeSpecSchema,
} from "../src/instructions/rollAway";
import { RoryOMoreInstructionSchema } from "../src/instructions/roryOMore";
import { ShoulderRoundInstructionSchema } from "../src/instructions/shoulderRound";
import { SplitSchema } from "../src/instructions/split";
import { SquareThroughInstructionSchema } from "../src/instructions/squareThrough";
import { StepInstructionSchema } from "../src/instructions/step";
import { SwingInstructionSchema } from "../src/instructions/swing";
import {
  TakeHandSchema,
  TakeHandsInstructionSchema,
} from "../src/instructions/takeHands";
import { TakeHandsInRingsInstructionSchema } from "../src/instructions/takeHandsInRings";
import { TurnAloneInstructionSchema } from "../src/instructions/turnAlone";
import { TurnAsACoupleInstructionSchema } from "../src/instructions/turnAsACouple";
import { UpTheHallInstructionSchema } from "../src/instructions/upTheHall";
import { ZigZagInstructionSchema } from "../src/instructions/zigZag";
import {
  InfallibleLabelSchema,
  IrreducibleLabelSchema,
  LabelSchema,
  NeighborLabelSchema,
  OffsetNeighborLabelSchema,
  OtherDirLabelSchema,
  SameDirLabelSchema,
  SettableLabelSchema,
  ShadowLabelSchema,
  SymmetricLabelSchema,
} from "../src/labels";
import {
  DancerHandPointerSchema,
  DancerJsonSchema,
  HandsJsonSchema,
  LabelsJsonSchema,
  VectorJsonSchema,
  WorldStateSchema,
} from "../src/worldState";

// All schemas to register, keyed by their output filename (without .schema.json).
// This is the single source of truth for which schemas get generated.
const allSchemas: Record<string, Z.ZodType> = {
  // Top-level
  Dance: DanceSchema,
  InitFormation: InitFormationSchema,
  InitFormationName: InitFormationNameSchema,
  Instruction: InstructionSchema,
  AtomicInstruction: AtomicInstructionSchema,
  Split: SplitSchema,

  // Instruction types
  Allemande: AllemandeInstructionSchema,
  Balance: BalanceInstructionSchema,
  BalanceTheRing: BalanceTheRingInstructionSchema,
  BendTheLine: BendTheLineInstructionSchema,
  BoxCirculate: BoxCirculateInstructionSchema,
  BoxTheGnat: BoxTheGnatInstructionSchema,
  CaliforniaTwirl: CaliforniaTwirlInstructionSchema,
  Circle: CircleInstructionSchema,
  CourtesyTurn: CourtesyTurnInstructionSchema,
  DoSiDo: DoSiDoInstructionSchema,
  DownTheHall: DownTheHallInstructionSchema,
  DropHands: DropHandsInstructionSchema,
  Face: FaceInstructionSchema,
  FormLongWaves: FormLongWavesInstructionSchema,
  FormShortWaves: FormShortWavesInstructionSchema,
  GiveAndTakeIntoSwing: GiveAndTakeIntoSwingInstructionSchema,
  GreetNewNeighbors: GreetNewNeighborsInstructionSchema,
  GreetShadow: GreetShadowInstructionSchema,
  LongLineInCenter: LongLineInCenterInstructionSchema,
  LongLinesForwardBack: LongLinesForwardBackInstructionSchema,
  MadRobin: MadRobinInstructionSchema,
  PassBy: PassByInstructionSchema,
  Petronella: PetronellaInstructionSchema,
  Poussette: PoussetteInstructionSchema,
  PullBy: PullByInstructionSchema,
  RightLeftThrough: RightLeftThroughInstructionSchema,
  RollAway: RollAwayInstructionSchema,
  RoryOMore: RoryOMoreInstructionSchema,
  ShoulderRound: ShoulderRoundInstructionSchema,
  SquareThrough: SquareThroughInstructionSchema,
  Step: StepInstructionSchema,
  Swing: SwingInstructionSchema,
  TakeHands: TakeHandsInstructionSchema,
  TakeHandsInRings: TakeHandsInRingsInstructionSchema,
  TurnAlone: TurnAloneInstructionSchema,
  TurnAsACouple: TurnAsACoupleInstructionSchema,
  UpTheHall: UpTheHallInstructionSchema,
  ZigZag: ZigZagInstructionSchema,

  // Shared field types
  InstructionId: InstructionIdSchema,
  TakeHand: TakeHandSchema,
  RolleeSpec: RolleeSpecSchema,
  ProgressionDir: ProgressionDirSchema,
  DancerOffset: DancerOffsetSchema,
  ProtoId: ProtoIdSchema,
  DancerId: DancerIdSchema,
  CalledIdentifier: CalledIdentifierSchema,
  PersonInDirection: PersonInDirectionSchema,
  CalledDirection: CalledDirectionSchema,
  CardinalDirection: CardinalDirectionSchema,
  PureDirection: PureDirectionSchema,
  TowardsLabelDirection: TowardsLabelDirectionSchema,
  TowardsPersonDirection: TowardsPersonDirectionSchema,

  // Labels
  Label: LabelSchema,
  ShadowLabel: ShadowLabelSchema,
  OffsetNeighborLabel: OffsetNeighborLabelSchema,
  NeighborLabel: NeighborLabelSchema,
  InfallibleLabel: InfallibleLabelSchema,
  SymmetricLabel: SymmetricLabelSchema,
  OtherDirLabel: OtherDirLabelSchema,
  SameDirLabel: SameDirLabelSchema,
  IrreducibleLabel: IrreducibleLabelSchema,
  SettableLabel: SettableLabelSchema,

  // WorldState (for custom initFormation)
  WorldState: WorldStateSchema,
  Dancer: DancerJsonSchema,
  DancerHandPointer: DancerHandPointerSchema,
  Hands: HandsJsonSchema,
  Labels: LabelsJsonSchema,
  VectorJson: VectorJsonSchema,
};

type SchemaBundle = Record<string, Record<string, unknown>>;

export function generateDanceJsonSchemas(): SchemaBundle {
  const reg = z.registry<{ id: string }>();
  for (const [name, schema] of Object.entries(allSchemas)) {
    reg.add(schema, { id: `${name}.schema.json` });
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Zod's toJSONSchema return type doesn't expose .schemas
  const bundle = z.toJSONSchema(reg, { io: "input" }) as unknown as {
    schemas: Record<string, Record<string, unknown>>;
  };

  return bundle.schemas;
}
