const express = require('express');
const { Kafka } = require('kafkajs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: [KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: 'payment-group' });
const producer = kafka.producer();

async function connectKafka(attempt = 1) {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'OrderCreated', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const order = JSON.parse(message.value.toString());
        console.log(`[Payment] Processing order #${order.id}...`);

        // Simulate payment (80% success)
        const isSuccess = Math.random() > 0.2;

        if (isSuccess) {
          console.log(`[Payment] Order #${order.id} SUCCESS`);
          await producer.send({
            topic: 'PaymentProcessed',
            messages: [{ value: JSON.stringify({ orderId: order.id, status: 'SUCCESS' }) }],
          });
        } else {
          console.log(`[Payment] Order #${order.id} FAILED`);
          await producer.send({
            topic: 'PaymentFailed',
            messages: [{ value: JSON.stringify({ orderId: order.id, status: 'FAILED', reason: 'Insufficient funds' }) }],
          });
        }
      },
    });
    console.log('[Kafka] Payment service consumers connected.');
  } catch (err) {
    console.warn(`[Kafka] Connection attempt ${attempt} failed: ${err.message}. Retrying in 5s...`);
    setTimeout(() => connectKafka(attempt + 1), 5000);
  }
}

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'payment-service' }));

app.listen(PORT, () => {
  console.log(`Payment service listening on port ${PORT}`);
  connectKafka();
});
