package com.example.forexsignals.data

import com.example.forexsignals.engine.MarketDataEngine
import com.example.forexsignals.model.ForexPair
import com.example.forexsignals.model.ForexSignal
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

interface DataRepository {
    fun getSignals(): Flow<List<ForexSignal>>
    fun getPairs(): List<ForexPair>
}

class DefaultDataRepository : DataRepository {
    override fun getSignals(): Flow<List<ForexSignal>> = flow {
        emit(MarketDataEngine.getInitialSignals())
    }

    override fun getPairs(): List<ForexPair> = MarketDataEngine.ALL_PAIRS
}
