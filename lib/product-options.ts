// lib/product-options.ts
// Centralized configuration dictionary for all hardware specifications.
// By decoupling this from UI Source code, updating hardware specs in the future becomes seamless.

export const RAM_GENERATIONS = [
    "ECC DDR3",
    "ECC DDR4",
    "ECC DDR5"
];

export const RAM_CAPACITIES = [
    "16GB",
    "32GB",
    "64GB",
    "128GB"
];

export const STORAGE_CAPACITIES = [
    "200GB",
    "480GB",
    "1.92TB",
    "2TB",
    "3.84TB",
    "4TB",
    "7.68TB",
    "15.36TB"
];

export const STORAGE_TYPES = [
    "SSD",
    "HDD"
];

export const STORAGE_INTERFACES = [
    "SATA",
    "NVME",
    "SAS",
    "PCIe"
];

export const STORAGE_FORM_FACTORS = [
    "M.2",
    "2.5\"",
    "3.5\"",
    "U.2"
];

export const CPU_SERIES = [
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Epyc",
    "Ryzen",
    "Core i5",
    "Core i7",
    "Core i9"
];

// Helper functions for options
export const getGenerations = () => RAM_GENERATIONS;
export const getCapacities = () => RAM_CAPACITIES;
export const getStorageCapacities = () => STORAGE_CAPACITIES;
export const getStorageTypes = () => STORAGE_TYPES;
export const getStorageInterfaces = () => STORAGE_INTERFACES;
export const getStorageFormFactors = () => STORAGE_FORM_FACTORS;
export const getCpuSeries = () => CPU_SERIES;
