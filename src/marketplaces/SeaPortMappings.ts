import {
  sale,
  transaction,
  currency,
} from '../../generated/schema'

import {
  MatchTransferWithSale
} from "../../src/utils/matchTransferSale"

import {
  OrderFulfilled,
} from '../../generated/SeaPort/SeaPort'

import {
  constants, ERC20Contracts, transactions
} from '../../src/graphprotocol-utils'

import { handleTransfer } from '../eip721/index'

import {
  BigDecimal, Address, BigInt
} from "@graphprotocol/graph-ts"

import {
	Transfer       as TransferEvent,
} from '../../generated/IERC721/IERC721'

// TakerAsk Handler starts here
export function handleOrderFulfilled(event: OrderFulfilled): void {

  //Use transaction receipts to check if the transfer has already been logged
  let _receipt = event.receipt 
  if (_receipt) {

    let _topic0 = Address.fromString('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
    //For each event in the _receipt.logs check if: 
    for (let index = 0; index < event.params.offer.length; index++) {
        
      //the topic0 is the correct event signature
      //the transferred token's collectionId & identifier belongs to the OrderFulfilled event that is being processed
      if ( _receipt.logs[index].topics[0] == _topic0
        && _receipt.logs[index].topics[3].toHex == event.params.offer[0].identifier.toHex
        && _receipt.logs[index].address.toHex == event.params.offer[0].token.toHex) {
          
          //Create faux TransferEvent
          let _transferEvent: TransferEvent 
          _transferEvent.address = _receipt.logs[index].address
          
          //run handleTransfer
          //handleTransfer(_transferEvent)
      }
    }
  }
  
  

  //////When sale occurs after transfers//////
  let tx = transaction.load(event.transaction.hash.toHexString())

  if (tx) {

    let saleEntity = sale.load(event.block.number.toString() + '-' + event.logIndex.toString())
    if (!saleEntity && tx.unmatchedTransferCount > 0) {

      ERC20Contracts.getERC20(event.params.offer[0].token)
      let currencyEntity = currency.load(event.params.offer[0].token.toHexString())

      if (currencyEntity) {
        let amountDecimals = 10 ** currencyEntity.decimals

        //4. sum the total amount for the sale
        let price = constants.BIGINT_ZERO
        for (let index = 0; index < event.params.offer.length; index++) {

          price = price.plus(event.params.offer[index].amount)

        }

        //5. Assign currency address, amount, txId and platform to sale entity
        let saleEntity = new sale(event.block.number.toString() + '-' + event.logIndex.toString())
        saleEntity.transaction = tx.id
        saleEntity.currency = currencyEntity.id
        saleEntity.platform = 'OpenSea'
        saleEntity.amount = price.divDecimal(BigDecimal.fromString(amountDecimals.toString()))
        saleEntity.blockNumber = event.block.number.toI32()
        saleEntity.timestamp = event.block.timestamp.toI32()
        saleEntity.save()

        //6. Assign sale.amount / transaction.unmatchedTransferCount to variable transferAmount to pass into transfer entities 
        // This derives the amount per transfer (eg each nft's amount in a bundle with 2 NFT's is the total price divided by 2.)
        let transferAmount = saleEntity.amount.div(BigDecimal.fromString(tx.unmatchedTransferCount.toString()))

        //6. Using unmatchedTransferId loop through the transfer entities and apply the transferAmount and assign saleId , 
        //reducing the unmatchedTransferCount by 1. save transfer update on each loop.
        if (tx.transfers && transferAmount && tx.id && saleEntity.id) {

          let array = tx.transfers
          for (let index = 0; index < array.length; index++) {

            let trId = array[index]

            MatchTransferWithSale(
              trId,
              transferAmount,
              tx.id,
              saleEntity.id,
              currencyEntity.symbol,
            )
          }
        }
      }
    }
  }
}

