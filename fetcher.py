import boto3
import json
from flask import Flask
import datetime

app = Flask(__name__)

def fetch_logs1(grpname, stream):
    client = boto3.client('logs')
    kwargs = {
        "logGroupName" : grpname,
        'logStreamName': stream,
        'limit': 1000,
    }
    while True:
        resp = client.get_log_events(**kwargs)
        yield from resp['events']
        try:
            kwargs['nextToken'] = resp['nextToken']
        except KeyError:
            break


def fetch_all_logs(grpname, streams):
    mapper = dict()
    temp = dict()
    mapper.setdefault(grpname, dict)
    for stream in streams:
        lst = list()
        for element in fetch_logs1(grpname, stream):
            lst.append(element)
        mapper.setdefault(stream, list()).append(lst)
    print(mapper)


def fetch_stream(loggrp = "fulcrum-prov"):
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

def fetch_all_streams(group):
    strms = list()
    grps_strms = dict()
    print("Fetching streams for group {}\n".format(group))
    for element in fetch_stream(group):
        strms.append(element["logStreamName"])
        grps_strms[group] = strms
    print(grps_strms)

groups = list()

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


def fetch_loggroups(to_find = "fulcrum-prov"):
    for element in fetch_groups():
        groups.append(element["logGroupName"])
    print("Fetched all the groups")

    if to_find in groups:
        return True
    return False