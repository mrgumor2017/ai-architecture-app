import React, { useState } from "react";
import { Form, Button, Row, Col, InputGroup } from "react-bootstrap";

export default function FileUploader({ onTrainFile }) {
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(""); // залишай порожнім — бекенд сам знайде "X"
  const [epochs, setEpochs] = useState(600);
  const [lr, setLR] = useState(0.001);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    await onTrainFile({ file, sheet: sheet || undefined, epochs: Number(epochs), lr: Number(lr) });
  };

  return (
    <Form onSubmit={handleUpload}>
      <Form.Group className="mb-3">
        <Form.Label>Файл CSV/Excel</Form.Label>
        <Form.Control type="file" onChange={(e) => setFile(e.target.files[0])} accept=".csv,.xlsx" />
        <Form.Text className="text-muted">
          Підтримка: <strong>.csv</strong> (X або X+Y у колонках), <strong>.xlsx</strong> (аркуші X і Y).
        </Form.Text>
      </Form.Group>

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
            <Form.Control type="number" step="0.0001" value={lr} onChange={(e) => setLR(e.target.value)} />
          </InputGroup>
        </Col>
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text>sheet</InputGroup.Text>
            <Form.Control placeholder="(необов’язково, напр. X)" value={sheet} onChange={(e) => setSheet(e.target.value)} />
          </InputGroup>
        </Col>
      </Row>

      <div className="mt-3">
        <Button variant="success" type="submit">Донавчити (файл)</Button>
      </div>
    </Form>
  );
}
