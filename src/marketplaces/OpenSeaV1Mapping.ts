import {
	sale,
    collection,
    token,
	transfer,
	transaction,
} from '../../generated/schema'

import {
	OrdersMatched,
} from '../../generated/OpenseaV1/OpenSeaV1'

import {
	constants,
} from '../../src/graphprotocol-utils'

import { 
    BigDecimal, 
    BigInt,
    log,
} from "@graphprotocol/graph-ts"

// TakerAsk Handler starts here
export function handleOSv1Sale(event: OrdersMatched): void {
  
  log.info(event.transaction.hash.toHex(), [])
  
  //1. load transaction
  let tx = transaction.load(event.transaction.hash.toHex())

  //2. nullcheck transaction entity (one should already exist for the transfer earlier in that) if it doesn't exist should we error or skip?  
  if (tx != null) {

    //3. create new sale entity (id = tx hash - eventId)  
    let saleEntity = new sale(tx.id + '-' + event.logIndex.toString())
    if (saleEntity != null) {

    //4. Assign currency address, amount, txId and platform to sale entity
    saleEntity.transaction = event.transaction.hash.toHex()
    saleEntity.currency = 'ETH'
    saleEntity.amount = event.params.price.divDecimal(BigDecimal.fromString('1000000000000000000'))
    saleEntity.platform = 'OpenSea'
    saleEntity.save
    
    //5. Assign sale.amount / transaction.unmatchedTransfersEventNum to variable transferAmount to pass into transfer entities (this is usually going to be 1, but in the event of a bundle sale there could be N+1 transfers for a single OrdersMatched)
    
    //let transferAmount  = saleEntity.amount.div(tx.unmatchedTransfersEventNum)  
        
    //6. Using unmatchedTransferEventId loop through the transfer entities and apply the transferAmount and assign saleId , reducing the unmatchedTransfersEventNum by 1 and removing the id from transaction.unmatchedTransferEventId. save transfer update on each loop.
    //7. Save sale and save transaction
    //8. Update daily/weekly/monthly metrics 
  
    }
  }

}

