import React, { useState } from "react";
import { Form, Button, Row, Col, InputGroup, Spinner, Alert } from "react-bootstrap";

export default function DataForm({ onPredictRequest, onTrainJSON }) {
  const [inputs, setInputs] = useState("");
  const [epochs, setEpochs] = useState(300);
  const [lr, setLR] = useState(0.001);
  const [withY, setWithY] = useState(false);
  const [ytext, setYtext] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [warnMsg, setWarnMsg] = useState("");

  const parseNumbers = (text) =>
    text
      .replaceAll(";", ",")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => Number(t));

  const handlePredict = async (e) => {
    e.preventDefault();
    setWarnMsg("");
    const numbers = parseNumbers(inputs);
    if (!numbers.length) { setWarnMsg("Введіть X_data."); return; }
    setPredicting(true);
    try {
      await onPredictRequest(numbers);
    } finally {
      setPredicting(false);
    }
  };

  const handleTrain = async (e) => {
    e.preventDefault();
    setWarnMsg("");

    const X_data = parseNumbers(inputs);
    if (!X_data.length) { setWarnMsg("Введіть X_data для навчання."); return; }

    let Y_data = undefined;
    if (withY && ytext.trim()) {
      const arr = parseNumbers(ytext);
      if (arr.length !== 441) {
        setWarnMsg(`Довжина Y_data має бути 441, зараз ${arr.length}.`);
        return;
      }
      const outOfRange = arr.filter(v => !(v === 0 || v === 1 || v === 2));
      if (outOfRange.length) {
        setWarnMsg("Y_data має містити лише значення 0, 1 або 2.");
        return;
      }
      Y_data = arr.map(v => Math.round(v));
    }

    const lrNum = Number(String(lr).replace(",", "."));
    if (!isFinite(lrNum) || lrNum <= 0 || lrNum > 0.1) {
      setWarnMsg("Некоректний lr. Використайте число у форматі 0.001 (з крапкою), 0 < lr ≤ 0.1");
      return;
    }

    await onTrainJSON({ X_data, Y_data, epochs: Number(epochs), lr: lrNum });
  };

  return (
    <>
      <Form onSubmit={handlePredict}>
        <Form.Group className="mb-2">
          <Form.Label>Введіть X_data (через кому)</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="0,1,0,0.5,0.8,0.8,0.9,0.3,0.7,0.7,0.8,1,..."
            value={inputs}
            onChange={(e) => setInputs(e.target.value)}
          />
          <Form.Text className="text-muted">Порада: довжина X має відповідати моделі (зараз 441).</Form.Text>
        </Form.Group>

        {!!warnMsg && <Alert variant="warning" className="py-2">{warnMsg}</Alert>}

        <div className="d-flex gap-2">
          <Button variant="primary" type="submit" disabled={predicting}>
            {predicting ? (<><Spinner size="sm" animation="border" className="me-2" /> Генеруємо…</>) : "ЗГЕНЕРУВАТИ АРХІТЕКТУРУ"}
          </Button>
          <Button variant="success" onClick={handleTrain}>ДОНАВЧИТИ (JSON)</Button>
        </div>

        <hr />

        <Row className="g-2">
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text>epochs</InputGroup.Text>
              <Form.Control type="number" min={1} max={5000} value={epochs} onChange={(e) => setEpochs(e.target.value)} />
            </InputGroup>
          </Col>
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text>lr</InputGroup.Text>
              <Form.Control
                type="text"
                value={lr}
                onChange={(e) => setLR(e.target.value)}
                placeholder="0.001"
              />
            </InputGroup>
            <Form.Text className="text-muted">Якщо у вас кома як десятковий роздільник — введіть 0.001 (з крапкою).</Form.Text>
          </Col>
        </Row>

        <Form.Check
          className="mt-3"
          type="switch"
          id="with-y-switch"
          label="Додати Y_data вручну (краща якість)"
          checked={withY}
          onChange={(e) => setWithY(e.target.checked)}
        />

        {withY && (
          <Form.Group className="mt-2">
            <Form.Label>Y_data (ровно 441 цілих значень 0..2, через кому)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="0,0,0,0,1,1,0,0,... (21x21=441 токенів)"
              value={ytext}
              onChange={(e) => setYtext(e.target.value)}
            />
          </Form.Group>
        )}
      </Form>
    </>
  );
}
