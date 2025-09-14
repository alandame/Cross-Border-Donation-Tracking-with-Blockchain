import { describe, it, expect, beforeEach } from "vitest";
import { uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_AMOUNT = 101;
const ERR_INVALID_DURATION = 102;
const ERR_INVALID_PENALTY = 103;
const ERR_INVALID_THRESHOLD = 104;
const ERR_ESCROW_ALREADY_EXISTS = 105;
const ERR_ESCROW_NOT_FOUND = 106;
const ERR_INVALID_ESCROW_TYPE = 114;
const ERR_INVALID_INTEREST = 115;
const ERR_INVALID_GRACE = 116;
const ERR_INVALID_LOCATION = 117;
const ERR_INVALID_CURRENCY = 118;
const ERR_INVALID_MIN_AMOUNT = 109;
const ERR_INVALID_MAX_AMOUNT = 110;
const ERR_MAX_ESCROWS_EXCEEDED = 113;
const ERR_INVALID_UPDATE_PARAM = 112;
const ERR_AUTHORITY_NOT_SET = 108;
const ERR_INVALID_RECIPIENT = 120;
const ERR_INVALID_CONDITION = 121;
const ERR_INVALID_RELEASE_TIME = 122;
const ERR_INVALID_REFUND_TIME = 123;
const ERR_INVALID_ARBITER = 124;
const ERR_INVALID_FEE = 125;
const ERR_UPDATE_NOT_ALLOWED = 111;
const ERR_INVALID_STATUS = 119;

interface Escrow {
  donor: string;
  recipient: string;
  amount: number;
  duration: number;
  penalty: number;
  threshold: number;
  timestamp: number;
  escrowType: string;
  interest: number;
  grace: number;
  location: string;
  currency: string;
  status: string;
  minAmount: number;
  maxAmount: number;
  condition: string;
  releaseTime: number;
  refundTime: number;
  arbiter: string;
  feePaid: boolean;
}

interface EscrowUpdate {
  updateAmount: number;
  updateDuration: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class EscrowMock {
  state: {
    nextEscrowId: number;
    maxEscrows: number;
    escrowFee: number;
    authorityContract: string | null;
    escrows: Map<number, Escrow>;
    escrowUpdates: Map<number, EscrowUpdate>;
    escrowsByDonor: Map<string, number[]>;
  } = {
    nextEscrowId: 0,
    maxEscrows: 1000,
    escrowFee: 500,
    authorityContract: null,
    escrows: new Map(),
    escrowUpdates: new Map(),
    escrowsByDonor: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1DONOR";
  contractCaller: string = "ST1CONTRACT";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextEscrowId: 0,
      maxEscrows: 1000,
      escrowFee: 500,
      authorityContract: null,
      escrows: new Map(),
      escrowUpdates: new Map(),
      escrowsByDonor: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1DONOR";
    this.contractCaller = "ST1CONTRACT";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setEscrowFee(newFee: number): Result<boolean> {
    if (newFee < 0) return { ok: false, value: ERR_INVALID_FEE };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    this.state.escrowFee = newFee;
    return { ok: true, value: true };
  }

  createEscrow(
    recipient: string,
    amount: number,
    duration: number,
    penalty: number,
    threshold: number,
    escrowType: string,
    interest: number,
    grace: number,
    location: string,
    currency: string,
    minAmount: number,
    maxAmount: number,
    condition: string,
    releaseTime: number,
    refundTime: number,
    arbiter: string
  ): Result<number> {
    if (this.state.nextEscrowId >= this.state.maxEscrows) return { ok: false, value: ERR_MAX_ESCROWS_EXCEEDED };
    if (recipient === this.caller) return { ok: false, value: ERR_INVALID_RECIPIENT };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (duration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
    if (penalty > 100) return { ok: false, value: ERR_INVALID_PENALTY };
    if (threshold <= 0 || threshold > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (!["donation", "charity", "aid"].includes(escrowType)) return { ok: false, value: ERR_INVALID_ESCROW_TYPE };
    if (interest > 20) return { ok: false, value: ERR_INVALID_INTEREST };
    if (grace > 30) return { ok: false, value: ERR_INVALID_GRACE };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minAmount <= 0) return { ok: false, value: ERR_INVALID_MIN_AMOUNT };
    if (maxAmount <= 0) return { ok: false, value: ERR_INVALID_MAX_AMOUNT };
    if (!condition || condition.length > 200) return { ok: false, value: ERR_INVALID_CONDITION };
    if (releaseTime <= this.blockHeight) return { ok: false, value: ERR_INVALID_RELEASE_TIME };
    if (refundTime <= this.blockHeight) return { ok: false, value: ERR_INVALID_REFUND_TIME };
    if (arbiter === this.caller) return { ok: false, value: ERR_INVALID_ARBITER };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };

    this.stxTransfers.push({ amount: this.state.escrowFee, from: this.caller, to: this.state.authorityContract! });
    this.stxTransfers.push({ amount: amount, from: this.caller, to: this.contractCaller });

    const id = this.state.nextEscrowId;
    const escrow: Escrow = {
      donor: this.caller,
      recipient,
      amount,
      duration,
      penalty,
      threshold,
      timestamp: this.blockHeight,
      escrowType,
      interest,
      grace,
      location,
      currency,
      status: "locked",
      minAmount,
      maxAmount,
      condition,
      releaseTime,
      refundTime,
      arbiter,
      feePaid: true,
    };
    this.state.escrows.set(id, escrow);
    const donorEscrows = this.state.escrowsByDonor.get(this.caller) || [];
    donorEscrows.push(id);
    this.state.escrowsByDonor.set(this.caller, donorEscrows);
    this.state.nextEscrowId++;
    return { ok: true, value: id };
  }

  getEscrow(id: number): Escrow | null {
    return this.state.escrows.get(id) || null;
  }

  updateEscrow(id: number, updateAmount: number, updateDuration: number): Result<boolean> {
    const escrow = this.state.escrows.get(id);
    if (!escrow) return { ok: false, value: ERR_ESCROW_NOT_FOUND };
    if (escrow.donor !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (escrow.status !== "locked") return { ok: false, value: ERR_UPDATE_NOT_ALLOWED };
    if (updateAmount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (updateDuration <= 0) return { ok: false, value: ERR_INVALID_DURATION };

    const updated: Escrow = {
      ...escrow,
      amount: updateAmount,
      duration: updateDuration,
      timestamp: this.blockHeight,
    };
    this.state.escrows.set(id, updated);
    this.state.escrowUpdates.set(id, {
      updateAmount,
      updateDuration,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  releaseFunds(id: number): Result<boolean> {
    const escrow = this.state.escrows.get(id);
    if (!escrow) return { ok: false, value: ERR_ESCROW_NOT_FOUND };
    if (escrow.status !== "locked") return { ok: false, value: ERR_INVALID_STATUS };
    if (this.caller !== escrow.arbiter && !(this.blockHeight >= escrow.releaseTime)) return { ok: false, value: ERR_NOT_AUTHORIZED };

    this.stxTransfers.push({ amount: escrow.amount, from: this.contractCaller, to: escrow.recipient });
    const updated: Escrow = { ...escrow, status: "released" };
    this.state.escrows.set(id, updated);
    return { ok: true, value: true };
  }

  refundFunds(id: number): Result<boolean> {
    const escrow = this.state.escrows.get(id);
    if (!escrow) return { ok: false, value: ERR_ESCROW_NOT_FOUND };
    if (escrow.status !== "locked") return { ok: false, value: ERR_INVALID_STATUS };
    if (this.caller !== escrow.arbiter && !(this.blockHeight >= escrow.refundTime)) return { ok: false, value: ERR_NOT_AUTHORIZED };

    this.stxTransfers.push({ amount: escrow.amount, from: this.contractCaller, to: escrow.donor });
    const updated: Escrow = { ...escrow, status: "refunded" };
    this.state.escrows.set(id, updated);
    return { ok: true, value: true };
  }

  getEscrowCount(): Result<number> {
    return { ok: true, value: this.state.nextEscrowId };
  }

  checkEscrowStatus(id: number): Result<string> {
    const escrow = this.state.escrows.get(id);
    if (!escrow) return { ok: false, value: "" };
    return { ok: true, value: escrow.status };
  }
}

describe("EscrowMock", () => {
  let contract: EscrowMock;

  beforeEach(() => {
    contract = new EscrowMock();
    contract.reset();
  });

  it("creates an escrow successfully", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const escrow = contract.getEscrow(0);
    expect(escrow?.donor).toBe("ST1DONOR");
    expect(escrow?.recipient).toBe("ST3RECIP");
    expect(escrow?.amount).toBe(1000);
    expect(escrow?.duration).toBe(30);
    expect(escrow?.penalty).toBe(5);
    expect(escrow?.threshold).toBe(50);
    expect(escrow?.escrowType).toBe("donation");
    expect(escrow?.interest).toBe(10);
    expect(escrow?.grace).toBe(7);
    expect(escrow?.location).toBe("CountryX");
    expect(escrow?.currency).toBe("STX");
    expect(escrow?.minAmount).toBe(500);
    expect(escrow?.maxAmount).toBe(2000);
    expect(escrow?.condition).toBe("customs cleared");
    expect(escrow?.releaseTime).toBe(100);
    expect(escrow?.refundTime).toBe(200);
    expect(escrow?.arbiter).toBe("ST4ARBITER");
    expect(escrow?.status).toBe("locked");
    expect(contract.stxTransfers).toEqual([
      { amount: 500, from: "ST1DONOR", to: "ST2AUTH" },
      { amount: 1000, from: "ST1DONOR", to: "ST1CONTRACT" },
    ]);
  });

  it("rejects escrow creation without authority", () => {
    const result = contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_SET);
  });

  it("rejects invalid amount", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.createEscrow(
      "ST3RECIP",
      0,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("rejects invalid escrow type", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "invalid",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_ESCROW_TYPE);
  });

  it("updates escrow successfully", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    const result = contract.updateEscrow(0, 1500, 45);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.amount).toBe(1500);
    expect(escrow?.duration).toBe(45);
    const update = contract.state.escrowUpdates.get(0);
    expect(update?.updateAmount).toBe(1500);
    expect(update?.updateDuration).toBe(45);
    expect(update?.updater).toBe("ST1DONOR");
  });

  it("rejects update for non-existent escrow", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.updateEscrow(99, 1500, 45);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ESCROW_NOT_FOUND);
  });

  it("rejects update by non-donor", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.caller = "ST5FAKE";
    const result = contract.updateEscrow(0, 1500, 45);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("releases funds successfully by arbiter", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.caller = "ST4ARBITER";
    const result = contract.releaseFunds(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.status).toBe("released");
    expect(contract.stxTransfers).toContainEqual({ amount: 1000, from: "ST1CONTRACT", to: "ST3RECIP" });
  });

  it("releases funds successfully after release time", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.blockHeight = 100;
    const result = contract.releaseFunds(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.status).toBe("released");
  });

  it("rejects release before time without arbiter", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.caller = "ST5FAKE";
    const result = contract.releaseFunds(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("refunds funds successfully by arbiter", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.caller = "ST4ARBITER";
    const result = contract.refundFunds(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.status).toBe("refunded");
    expect(contract.stxTransfers).toContainEqual({ amount: 1000, from: "ST1CONTRACT", to: "ST1DONOR" });
  });

  it("refunds funds successfully after refund time", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.blockHeight = 200;
    const result = contract.refundFunds(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.status).toBe("refunded");
  });

  it("rejects refund before time without arbiter", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.caller = "ST5FAKE";
    const result = contract.refundFunds(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets escrow fee successfully", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.setEscrowFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.escrowFee).toBe(1000);
  });

  it("rejects invalid fee", () => {
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.setEscrowFee(-1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_FEE);
  });

  it("returns correct escrow count", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    contract.createEscrow(
      "ST6RECIP",
      2000,
      60,
      10,
      60,
      "charity",
      15,
      14,
      "CountryY",
      "USD",
      1000,
      4000,
      "aid delivered",
      150,
      250,
      "ST7ARBITER"
    );
    const result = contract.getEscrowCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks escrow status correctly", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    const result = contract.checkEscrowStatus(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe("locked");
    const result2 = contract.checkEscrowStatus(99);
    expect(result2.ok).toBe(false);
    expect(result2.value).toBe("");
  });

  it("rejects escrow creation with max exceeded", () => {
    contract.setAuthorityContract("ST2AUTH");
    contract.state.maxEscrows = 1;
    contract.createEscrow(
      "ST3RECIP",
      1000,
      30,
      5,
      50,
      "donation",
      10,
      7,
      "CountryX",
      "STX",
      500,
      2000,
      "customs cleared",
      100,
      200,
      "ST4ARBITER"
    );
    const result = contract.createEscrow(
      "ST6RECIP",
      2000,
      60,
      10,
      60,
      "charity",
      15,
      14,
      "CountryY",
      "USD",
      1000,
      4000,
      "aid delivered",
      150,
      250,
      "ST7ARBITER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_ESCROWS_EXCEEDED);
  });

  it("parses amount with Clarity", () => {
    const amount = uintCV(1000);
    expect(amount.value).toEqual(BigInt(1000));
  });
});