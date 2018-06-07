import { Mutations, Actions, Getters } from '@/constants/types.constants';
import { getAccountInfo, transfer, getTransferRecord, getTransAction , getBpsTable, vote, unfreeze, claim } from '@/services/Eos';

const initState = {
  accountName: '',
  info: {},
  bpsTable: [],
  transferRecords: [],
    latestTransferNum:0
}

const mutations = {
  [Mutations.SET_ACCOUNT_NAME](state, { accountName = '' } = {}) {
    state.accountName = accountName;
  },
  [Mutations.SET_ACCOUNT_INFO](state, { info = {} } = {}) {
    state.info = info;
  },
  [Mutations.SET_BPS_TABLE](state, { bpsTable = [] } = {}) {
    state.bpsTable = bpsTable;
  },
  [Mutations.SET_TRANSFER_RECORDS](state, { transferRecords = [] } = {}) {
    state.transferRecords = transferRecords;
  },
    [Mutations.SET_LATEST_TRANSFER_NUM](state, { transferRecords = [] } = {}) {
        state.latestTransferNum = getLatestNum(transferRecords)
    },
    [Mutations.SET_ACTION_STATUS](state, { actionDetail = [] } = {}) {
        state.transferRecords = addStatus(state.transferRecords, actionDetail)
    },
};

const actions = {
  [Actions.REFRESH_APP]({ state, commit, dispatch }) {
    dispatch(Actions.FETCH_ACCOUNT, { accountName: state.accountName });
  },
  [Actions.FETCH_ACCOUNT]({ commit, dispatch }, { accountName }) {
    commit(Mutations.SET_ACCOUNT_NAME, { accountName });
    dispatch(Actions.GET_ACCOUNT_INFO);
  },
  [Actions.TRANSFER]({ state, dispatch, getters }, { from, to, amount, password }) {
    return getters[Getters.GET_TRANSE_CONFIG](password, from).then(config => {
      return transfer(config)({ from, to, amount });
    });
  },
  [Actions.VOTE]({ state, dispatch, getters }, { voter, bpname, amount, password }) {
    return getters[Getters.GET_TRANSE_CONFIG](password, voter).then(config => {
      return vote(config)({ voter, bpname, amount });
    });
  },
  [Actions.UNFREEZE]({ state, dispatch, getters }, { voter, bpname, password }) {
    return getters[Getters.GET_TRANSE_CONFIG](password, voter).then(config => {
      return unfreeze(config)({ voter, bpname });
    });
  },
  [Actions.CLAIM]({ state, dispatch, getters }, { voter, bpname, password }) {
    return getters[Getters.GET_TRANSE_CONFIG](password, voter).then(config => {
      return claim(config)({ voter, bpname });
    });
  },
  [Actions.UPDATE_BP]({ state, dispatch, getters }, { password, producerKey, commissionRate, expiration }) {
    if (!getters[Getters.CURRENT_ACCOUNT_NAME]) return Promise.reject(new Error('account ������'))
    return getters[Getters.GET_WIF](password).then(wif => {
      return genUpdatebp(wif)({
        bpname: getters[Getters.CURRENT_ACCOUNT_NAME],
        producerKey,
        commissionRate,
        expiration: expiration,
      })
    })
  },
  [Actions.GET_ACCOUNT_INFO]({ state, dispatch, commit, getters }) {
    const accountName = getters[Getters.CURRENT_ACCOUNT_NAME];
    return getAccountInfo(getters[Getters.CURRENT_NODE])(accountName).then(({ info, bpsTable }) => {
      commit(Mutations.SET_ACCOUNT_INFO, { info });
      commit(Mutations.SET_BPS_TABLE, { bpsTable });
      return dispatch(Actions.GET_TRANSFER_RECORD, { accountName });
    });
  },
    [Actions.GET_TRANSFER_RECORD]({ dispatch, commit, getters }, { accountName, pos, offset }) {
        return getTransferRecord(getters[Getters.CURRENT_NODE])({ accountName, pos, offset }).then(result => {
            commit(Mutations.SET_TRANSFER_RECORDS, { transferRecords: result.actions });
            if( pos == undefined )
            {
                commit(Mutations.SET_LATEST_TRANSFER_NUM, { transferRecords: result.actions })
            }
            dispatch(Actions.GET_TRANS_ACTION, { transferRecords: result.actions });
        });
    },
    [Actions.GET_TRANS_ACTION]({ commit, getters }, { transferRecords }) {
        return transferRecords.forEach(function (record) {
            getTransAction(getters[Getters.CURRENT_NODE])({ tid: record.action_trace.trx_id }).then(result => {
                //console.log(result);
                if(result.trx)
                {
                    commit(Mutations.SET_ACTION_STATUS, { actionDetail: result })
                }
            });
        });
    },
  [Actions.GET_BPS_TABLE]({ state, dispatch, commit, getters }) {
    const accountName = getters[Getters.CURRENT_ACCOUNT_NAME];
    return getAccountInfo(getters[Getters.CURRENT_NODE])(accountName).then(({  bpsTable }) => {
      commit(Mutations.SET_BPS_TABLE, { bpsTable });
    });
  },
};
var addStatus= (transferRecords , actionDetail) => {
    var out=[];
    transferRecords.forEach(function (record) {
        if(record.action_trace.trx_id == actionDetail.id){
            record.status = actionDetail.trx.receipt.status;
        }
        out.push(record);
    })
    return out;
}


var getLatestNum = transferRecords =>{
    let latestNum = 0;
    transferRecords.forEach(function (record) {
        if(record.account_action_seq > latestNum){
            latestNum = record.account_action_seq
        }
    })
    return latestNum
}

const getters = {
  [Getters.CURRENT_ACCOUNT_NAME](state, getters, rootState) {
    return state.accountName;
  },
};

export default {
  state: initState,
  mutations,
  actions,
  getters,
};
