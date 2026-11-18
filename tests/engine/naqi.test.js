import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSubIndex,
  getAQICategory,
  calculateRollingMean,
  calculateNAQI,
} from "../../web/js/engine/naqi.js";

test("PM2.5 Breakpoints and Boundaries: Good (0-30)", () => {
  assert.equal(calculateSubIndex(0, "pm25").subIndex, 0);
  assert.equal(calculateSubIndex(0, "pm25").category, "Good");

  assert.equal(calculateSubIndex(15, "pm25").subIndex, 25);
  assert.equal(calculateSubIndex(15, "pm25").category, "Good");

  assert.equal(calculateSubIndex(30, "pm25").subIndex, 50);
  assert.equal(calculateSubIndex(30, "pm25").category, "Good");
});

test("PM2.5 Breakpoints and Boundaries: Satisfactory (31-60)", () => {
  assert.equal(calculateSubIndex(31, "pm25").subIndex, 51);
  assert.equal(calculateSubIndex(31, "pm25").category, "Satisfactory");

  assert.equal(calculateSubIndex(60, "pm25").subIndex, 100);
  assert.equal(calculateSubIndex(60, "pm25").category, "Satisfactory");
});

test("PM2.5 Breakpoints and Boundaries: Moderate (61-90)", () => {
  assert.equal(calculateSubIndex(61, "pm25").subIndex, 101);
  assert.equal(calculateSubIndex(61, "pm25").category, "Moderate");

  assert.equal(calculateSubIndex(90, "pm25").subIndex, 200);
  assert.equal(calculateSubIndex(90, "pm25").category, "Moderate");
});

test("PM2.5 Breakpoints and Boundaries: Poor (91-120)", () => {
  assert.equal(calculateSubIndex(91, "pm25").subIndex, 201);
  assert.equal(calculateSubIndex(91, "pm25").category, "Poor");

  assert.equal(calculateSubIndex(120, "pm25").subIndex, 300);
  assert.equal(calculateSubIndex(120, "pm25").category, "Poor");
});

test("PM2.5 Breakpoints and Boundaries: Very Poor (121-250)", () => {
  assert.equal(calculateSubIndex(121, "pm25").subIndex, 301);
  assert.equal(calculateSubIndex(121, "pm25").category, "Very Poor");

  assert.equal(calculateSubIndex(250, "pm25").subIndex, 400);
  assert.equal(calculateSubIndex(250, "pm25").category, "Very Poor");
});

test("PM2.5 Breakpoints and Boundaries: Severe (251+)", () => {
  assert.equal(calculateSubIndex(251, "pm25").subIndex, 401);
  assert.equal(calculateSubIndex(251, "pm25").category, "Severe");

  assert.equal(calculateSubIndex(380, "pm25").subIndex, 500);
  assert.equal(calculateSubIndex(450, "pm25").subIndex, 500);
  assert.equal(calculateSubIndex(450, "pm25").category, "Severe");
});

test("PM10 Breakpoints and Boundaries: across all 6 classes", () => {
  assert.equal(calculateSubIndex(0, "pm10").subIndex, 0);
  assert.equal(calculateSubIndex(50, "pm10").subIndex, 50);

  assert.equal(calculateSubIndex(51, "pm10").subIndex, 51);
  assert.equal(calculateSubIndex(100, "pm10").subIndex, 100);

  assert.equal(calculateSubIndex(101, "pm10").subIndex, 101);
  assert.equal(calculateSubIndex(250, "pm10").subIndex, 200);

  assert.equal(calculateSubIndex(251, "pm10").subIndex, 201);
  assert.equal(calculateSubIndex(350, "pm10").subIndex, 300);

  assert.equal(calculateSubIndex(351, "pm10").subIndex, 301);
  assert.equal(calculateSubIndex(430, "pm10").subIndex, 400);

  assert.equal(calculateSubIndex(431, "pm10").subIndex, 401);
  assert.equal(calculateSubIndex(500, "pm10").subIndex, 500);
  assert.equal(calculateSubIndex(600, "pm10").subIndex, 500);
});

test("getAQICategory maps numeric bands accurately", () => {
  assert.equal(getAQICategory(30), "Good");
  assert.equal(getAQICategory(75), "Satisfactory");
  assert.equal(getAQICategory(150), "Moderate");
  assert.equal(getAQICategory(250), "Poor");
  assert.equal(getAQICategory(350), "Very Poor");
  assert.equal(getAQICategory(450), "Severe");
});

test("calculateRollingMean computes moving 24h averages correctly", () => {
  const constant = Array(24).fill(100);
  const means = calculateRollingMean(constant, 24);
  assert.equal(means[0], 100);
  assert.equal(means[23], 100);

  const ramp = [10, 20, 30];
  const rampMeans = calculateRollingMean(ramp, 2);
  assert.equal(rampMeans[0], 10);
  assert.equal(rampMeans[1], 15);
  assert.equal(rampMeans[2], 25);
});

test("calculateNAQI selects dominant pollutant and headline category", () => {
  // PM2.5 dominates
  const res1 = calculateNAQI(150, 50);
  assert.equal(res1.dominantPollutant, "pm25");
  assert.equal(res1.category, "Very Poor");
  assert.ok(res1.aqi >= 301 && res1.aqi <= 400);

  // PM10 dominates
  const res2 = calculateNAQI(25, 300);
  assert.equal(res2.dominantPollutant, "pm10");
  assert.equal(res2.category, "Poor");
  assert.ok(res2.aqi >= 201 && res2.aqi <= 300);

  // Tie selects pm25
  const res3 = calculateNAQI(30, 50);
  assert.equal(res3.dominantPollutant, "pm25");
  assert.equal(res3.category, "Good");
});
