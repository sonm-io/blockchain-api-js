module.exports = {
    livenet: {
        url: 'https://mainnet.infura.io',
        contractAddress: {},
    },
    livenet_private: {
        url: 'https://sidechain.livenet.sonm.com',
        contractAddress: {
            addressRegistry: '0xd1a6f3d1ae33b4b19565a6b283d7a05c5a0decb0',
        },
    },
    rinkeby: {
        url: 'https://rinkeby.infura.io',
        contractAddress: {},
    },
    rinkeby_private: {
        url: 'https://sidechain-dev.sonm.com',
        contractAddress: {
            addressRegistry: '0x79b084653ca2588ed3915159e368db58aef165ee',
        },
    },
    testrpc: {
        url: 'https://proxy.test.sonm.com:8545',
        contractAddress: {},
    },
    testrpc_private: {
        url: 'https://proxy.test.sonm.com:8546',
        contractAddress: {
            addressRegistry: '0x4b90dff4de1eb5a8581f3200bd5956c9b8dd6346',
        },
    },
};