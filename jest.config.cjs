module.exports = {
    roots: ['<rootDir>/src'],
    collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
    coverageDirectory: 'coverage',
    testPathIgnorePatterns: ['<rootDir>/node_modules/'],
    testEnvironment: 'node',
    transform: {
        '.+\\.ts$': ['ts-jest'],
    },
    moduleNameMapper: {
        '@/(.*)': '<rootDir>/src/$1',
    },
}
