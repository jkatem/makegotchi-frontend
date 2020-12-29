import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
// import { Link } from 'react-router-dom';

class TamaStore extends React.Component{

    state={
        tamaNumber: 0
    }


    // render 2 new tamas on click
    moreTamagotchis = () => {
        
        // when hit last tama, render tama list again from beginning
        if(this.state.tamaNumber <= this.props.allSpecies.length-2){
            this.setState(prevState => {
                return{
                    tamaNumber: prevState.tamaNumber + 2
                }
            })
        } else {
            this.setState({tamaNumber: 0})
        }

    }


    render(){
        return(
            <div>
                <h3>Tama Store</h3>

                {/* list of tamagotchis */}
                <ListGroup variant="flush">
                    {this.props.allSpecies.slice(this.state.tamaNumber, this.state.tamaNumber + 2).map((pet, idx) => 
                        <ListGroup.Item>
                            <Container>
                                <Row>
                                    <Col>
                                        <img src={pet.img_url} alt='tamagotchiiii'/>
                                        
                                        {/* should link to user's pet list */}
                                        {this.props.buysLeft > 0 ? 
                                            <Button 
                                            id={idx+this.state.tamaNumber} 
                                            variant="outline-info" 
                                            onClick={() =>{ 
                                                this.props.openModal()
                                                this.props.purchaseTama(this.props.allSpecies[idx+this.state.tamaNumber])}
                                            }>
                                                Purchase
                                            </Button>
                                            :
                                            null
                                        }
                                    </Col>

                                    <Col>Specie: {pet.species}</Col>
                                    <Col>Personality: {pet.personality}</Col>
                                    <Col>Hangry Rate: {pet.hunger_rate}</Col>
                                    <Col>Shleepy Rate: {pet.sleepy_rate}</Col>
                                    <Col>Smelly Rate: {pet.dirt_rate}</Col>
                                </Row>
                            </Container>
                        </ListGroup.Item>
                    )}
                </ListGroup>


                <Button variant="outline-success" onClick={this.moreTamagotchis}>
                    More Tamas!!
                </Button>

            </div>
        )
    }
}
export default TamaStore