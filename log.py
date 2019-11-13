import boto3
import json
from flask import Flask, request, jsonify
import datetime


app = Flask(__name__)
"""with open("config.json", 'r') as fopen:
    info = json.load(fopen)
    log_group = info['log_group']
    streams = info['streamNames']
"""

groups = list()


def fetch_logs1(grpname, stream, startTime, endTime):
    client = boto3.client('logs')
    kwargs = {
        "logGroupName": grpname,
        'logStreamName': stream,
        'limit': 10000,
        'startTime': startTime,
        'endTime': endTime,
        'startFromHead': True,
    }
    while True:
        resp = client.get_log_events(**kwargs)
        yield from resp['events']
        try:
            kwargs['nextToken'] = resp['nextToken']
        except KeyError:
            break


@app.route("/fetchlogs", methods=["POST"])
def fetch_all_logs():
    res = request.get_json(force=True)
    epoch = datetime.datetime(1970, 1, 1)
    p = "%Y-%m-%dT%H:%M"
    grpname = request.json["log_group"]
    streams = request.json["streams"]
    startTime = request.json["startTime"]
    startTime = int(((datetime.datetime.strptime(startTime, p) - epoch).total_seconds()*1000))
    endTime = request.json["endTime"]
    endTime = int(((datetime.datetime.strptime(endTime, p) - epoch).total_seconds()*1000))
    mapper = dict()
    result = dict()
    # mapper.setdefault(grpname, dict)
    for stream in streams:
        lst = list()
        for element in fetch_logs1(grpname, stream, startTime, endTime):
            # Convert ingestion time to CST
            t_in = str(element["ingestionTime"])
            tin = t_in[:len(t_in)-3]
            temp = datetime.datetime.fromtimestamp(int(tin)).strftime('%c')
            element["ingestionTime"] = temp
            # Convert timestamp to CST
            t_in = str(element["timestamp"])
            tin = t_in[:len(t_in)-3]
            temp = datetime.datetime.fromtimestamp(int(tin)).strftime('%c')
            element["timestamp"] = temp
            lst.append(element)
        mapper.setdefault(stream, list()).extend(lst)
        result[grpname] = mapper
    return jsonify(result)


def fetch_stream(loggrp="fulcrum-prov"):
    client = boto3.client('logs')
    kwargs = {
        'logGroupName': loggrp,
        'limit': 50,
    }
    while True:
        response = client.describe_log_streams(**kwargs)
        yield from response['logStreams']
        try:
            kwargs['nextToken'] = response['nextToken']
        except KeyError:
            break


@app.route("/fetchstreams", methods=["POST"])
def fetch_all_streams():
    group = request.json["log_group"]
    # group = group["log_group"]
    strms = list()
    grps_strms = dict()
    for element in fetch_stream(group):
        strms.append(element["logStreamName"])
    grps_strms[group] = strms
    return jsonify(grps_strms)


def fetch_groups():
    client = boto3.client('logs')
    kwargs = {
        'limit': 50,
    }
    while True:
        resp = client.describe_log_groups(**kwargs)
        yield from resp['logGroups']
        try:
            kwargs['nextToken'] = resp['nextToken']
        except KeyError:
            break


@app.route("/fetchgroups", methods=["POST"])
def fetch_loggroups():
    to_find = request.json["log_group"]
    for element in fetch_groups():
        groups.append(element["logGroupName"])
    if to_find in groups:
        return {"Status": "Success"}
    return {"Status": "Failure"}


if __name__ == '__main__':
    app.run()
