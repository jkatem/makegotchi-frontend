import React from 'react'
import TicTacToeBoard from './TicTacToeBoard'
import '../css/Game.css'

class TicTacToeGame extends React.Component {
    render() {
      return (
        <div className="game">
          <div className="game-board">
            <TicTacToeBoard updateMoneyLeft={this.props.updateMoneyLeft} gamble={this.props.gamble} handleClick={this.props.handleClick}/>
          </div>
        </div>
      );
    }
  }

export default TicTacToeGame